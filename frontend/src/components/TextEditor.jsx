import React, { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const TextEditor = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const $editor = document.createElement("div");
    containerRef.current.append($editor);

    new Quill($editor, {
      theme: "snow",
    });

    return () => {
      containerRef.current.innerHTML = "";
    };
  }, []);

  return <div ref={containerRef}></div>;
};

export default TextEditor;
