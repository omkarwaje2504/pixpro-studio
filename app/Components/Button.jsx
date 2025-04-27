"use client"
import React from "react";

function Button({ children, type, disabled, onClick,setting }) {

  const primaryColor = setting?.primaryColor || "#971212";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        backgroundColor: primaryColor,
        color: "#fff",
      }}
      className="addbutton drop-shadow-md border-2 font-medium rounded-2xl"
    >
      {children}
    </button>
  );
}

export default Button;
