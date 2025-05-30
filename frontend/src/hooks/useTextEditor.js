import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Quill from "quill";
import { io } from "socket.io-client";
import QuillCursors from "quill-cursors";

Quill.register("modules/cursors", QuillCursors);

const SERVER_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
const SAVE_INTERVAL = 2000;
const TYPING_DELAY = 1000;

const useTextEditor = () => {
  const { id: docId } = useParams();
  const [username, setUsername] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [socket, setSocket] = useState(null);
  const [quill, setQuill] = useState(null);
  const [typingUserId, setTypingUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const containerRef = useRef(null);
  const cursorsRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isReady) return;

    const s = io(SERVER_URL, {
      query: { username },
    });
    setSocket(s);

    const $editor = document.createElement("div");
    containerRef.current.append($editor);

    const q = new Quill($editor, {
      theme: "snow",
      modules: {
        cursors: {
          transformOnTextChange: true,
        },
      },
    });

    q.disable();
    q.setText("");
    setQuill(q);
    cursorsRef.current = q.getModule("cursors");

    return () => {
      s?.disconnect();
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [isReady]);

  useEffect(() => {
    if (socket === null || quill === null) return;

    const handleTextChange = (delta, oldDelta, source) => {
      if (source !== "user") return;

      socket.emit("text-change", delta);
      socket.emit("user-typing", true);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("user-typing", false);
      }, TYPING_DELAY);
    };

    const handleReceiveUserTyping = (userId, state) => {
      setTypingUserId(state ? userId : null);
    };

    const handleSelectionChange = (range, oldRange, source) => {
      if (source !== "user" || range == null) return;
      socket.emit("cursor-change", { range, username });
    };

    const handleReceiveCursorChange = ({ userId, range, username, color }) => {
      cursorsRef.current.createCursor(userId, username, color);
      cursorsRef.current.moveCursor(userId, range);
    };

    const handleRemoveCursor = (userId) => {
      cursorsRef.current.removeCursor(userId);
    };

    const handleReceiveTextChange = (delta) => {
      quill.updateContents(delta);
    };

    const interval = setInterval(() => {
      socket.emit("save-doc", quill.getContents());
    }, SAVE_INTERVAL);

    const handleUsers = (users) => {
      setUsers(users);
    };

    quill.on("selection-change", handleSelectionChange);
    quill.on("text-change", handleTextChange);
    socket.on("receive-text-change", handleReceiveTextChange);
    socket.on("receive-cursor-change", handleReceiveCursorChange);
    socket.on("receive-user-typing", handleReceiveUserTyping);
    socket.on("remove-cursor", handleRemoveCursor);
    socket.on("users", handleUsers);

    return () => {
      quill.off("text-change", handleTextChange);
      quill.off("selection-change", handleSelectionChange);
      socket.off("receive-text-change", handleReceiveTextChange);
      socket.off("receive-cursor-change", handleReceiveCursorChange);
      socket.off("receive-user-typing", handleReceiveUserTyping);
      socket.off("remove-cursor", handleRemoveCursor);
      socket.off("users", handleUsers);
      clearInterval(interval);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [quill, socket]);

  useEffect(() => {
    if (socket === null || quill === null) return;

    socket.once("load-doc", (doc) => {
      quill.setContents(doc);
      quill.enable();
    });

    socket.emit("get-doc", docId);
  }, [quill, socket, docId]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    return username.trim() && setIsReady(true);
  };

  return {
    isReady,
    containerRef,
    users,
    username,
    setUsername,
    handleFormSubmit,
    typingUserId,
  };
};

export default useTextEditor;
