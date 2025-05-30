import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Quill from "quill";
import { io } from "socket.io-client";
import "quill/dist/quill.snow.css";
import QuillCursors from "quill-cursors";
import JoinForm from "./JoinForm";

Quill.register("modules/cursors", QuillCursors);

const SERVER_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
const SAVE_INTERVAL = 2000;

const TextEditor = () => {
  const { id: docId } = useParams();
  const [username, setUsername] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [socket, setSocket] = useState(null);
  const [quill, setQuill] = useState(null);
  const [users, setUsers] = useState([]);
  const containerRef = useRef(null);
  const cursorsRef = useRef(null);

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
    socket.on("remove-cursor", handleRemoveCursor);
    socket.on("users", handleUsers);

    return () => {
      quill.off("text-change", handleTextChange);
      quill.off("selection-change", handleSelectionChange);
      socket.off("receive-text-change", handleReceiveTextChange);
      socket.off("receive-cursor-change", handleReceiveCursorChange);
      socket.off("remove-cursor", handleRemoveCursor);
      socket.off("users", handleUsers);
      clearInterval(interval);
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

  if (!isReady) {
    return <JoinForm {...{ username, setUsername, handleFormSubmit }} />;
  }

  return (
    <div className="app-container">
      <div className="editor-wrapper" ref={containerRef}></div>
      <div className="active-users">
        <div className="active-users-title">active users</div>
        <div className="active-users-content">
          {users.map(({ username, color, id }) => (
            <p key={id} style={{ color }}>
              {username}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TextEditor;
