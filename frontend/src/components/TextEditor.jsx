import React, { useEffect, useRef } from "react";
import Quill from "quill";
import { io } from "socket.io-client";
import "quill/dist/quill.snow.css";

const TextEditor = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const socket = io("http://localhost:3001");

    const $editor = document.createElement("div");
    containerRef.current.append($editor);
    new Quill($editor, {
      theme: "snow",
    });

    return () => {
      containerRef.current.innerHTML = "";
      socket.disconnect();
    };
  }, []);

  return <div id="wrapper" ref={containerRef}></div>;
};

export default TextEditor;
