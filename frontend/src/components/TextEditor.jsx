import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Quill from "quill";
import { io } from "socket.io-client";
import "quill/dist/quill.snow.css";

const TextEditor = () => {
  const { id: docId } = useParams();
  const [socket, setSocket] = useState(null);
  const [quill, setQuill] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const s = io("http://localhost:3001");
    setSocket(s);

    const $editor = document.createElement("div");
    containerRef.current.append($editor);
    const q = new Quill($editor, {
      theme: "snow",
    });
    q.disable();
    q.setText("Loading...");
    setQuill(q);

    return () => {
      s?.disconnect();
      containerRef.current.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    if (socket === null || quill === null) return;

    const handleTextChange = (delta, oldDelta, source) => {
      if (source !== "user") return;
      socket.emit("text-change", delta);
    };

    const handleReceiveTextChange = (delta) => {
      quill.updateContents(delta);
    };

    quill.on("text-change", handleTextChange);
    socket.on("receive-text-change", handleReceiveTextChange);

    return () => {
      quill.off("text-change", handleTextChange);
      socket.off("receive-text-change", handleReceiveTextChange);
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

  return <div id="wrapper" ref={containerRef}></div>;
};

export default TextEditor;
