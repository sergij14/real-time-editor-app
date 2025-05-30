import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Quill from "quill";
import { io } from "socket.io-client";
import "quill/dist/quill.snow.css";
import QuillCursors from "quill-cursors";

Quill.register("modules/cursors", QuillCursors);

const SERVER_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
const SAVE_INTERVAL = 2000;

const TextEditor = () => {
  const { id: docId } = useParams();
  const [username, setUsername] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [socket, setSocket] = useState(null);
  const [quill, setQuill] = useState(null);
  const containerRef = useRef(null);
  const cursorsRef = useRef(null);
  const userColorsRef = useRef({});

  const getUserColor = (userId) => {
    if (!userColorsRef.current[userId]) {
      userColorsRef.current[userId] = `hsl(${Math.random() * 360}, 100%, 70%)`;
    }
    return userColorsRef.current[userId];
  };

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
    q.setText("Loading...");
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

    const handleReceiveCursorChange = ({ userId, range, username }) => {
      const color = getUserColor(userId);
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

    quill.on("selection-change", handleSelectionChange);
    quill.on("text-change", handleTextChange);
    socket.on("receive-text-change", handleReceiveTextChange);
    socket.on("receive-cursor-change", handleReceiveCursorChange);
    socket.on("remove-cursor", handleRemoveCursor);

    return () => {
      quill.off("text-change", handleTextChange);
      quill.off("selection-change", handleSelectionChange);
      socket.off("receive-text-change", handleReceiveTextChange);
      socket.off("receive-cursor-change", handleReceiveCursorChange);
      socket.off("remove-cursor", handleRemoveCursor);
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

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <input
          className="border px-4 py-2 text-lg rounded"
          placeholder="Enter your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          onClick={() => username.trim() && setIsReady(true)}
        >
          Join Document
        </button>
      </div>
    );
  }

  return <div id="wrapper" ref={containerRef}></div>;
};

export default TextEditor;
