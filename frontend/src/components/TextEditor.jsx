import React from "react";
import JoinForm from "./JoinForm";
import useTextEditor from "../hooks/useTextEditor";
import "quill/dist/quill.snow.css";

const TextEditor = () => {
  const {
    isReady,
    containerRef,
    users,
    username,
    setUsername,
    handleFormSubmit,
  } = useTextEditor();

  if (!isReady) {
    return <JoinForm {...{ username, setUsername, handleFormSubmit }} />;
  }

  return (
    <div className="editor-container">
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
