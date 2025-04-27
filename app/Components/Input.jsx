import React from "react";

function Input({
  text,
  autoComplete,
  id,
  type,
  placeholder,
  onChange,
  errorMessage,
}) {
  return (
    <div className="relative">
      <input
        autoComplete={autoComplete ? "autoComplete" : "off"}
        id={id}
        name={id}
        type={type}
        className="peer bg-transparent placeholder-transparent h-12 text-lg w-full border-b-2 border-gray-300 text-gray-900 dark:border-gray-700 dark:text-gray-100 focus:outline-none focus:border-rose-600 dark:focus:border-blue-500"
        placeholder={placeholder ? placeholder : ""}
        onChange={onChange}
      />
      <label
        htmlFor={id}
        className="absolute left-0 -top-3.5 text-gray-600 text-md dark:text-gray-100 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-600 dark:peer-placeholder-shown:text-gray-300 peer-placeholder-shown:top-2 transition-all peer-focus:-top-3.5 peer-focus:text-gray-600 dark:peer-focus:text-gray-300 peer-focus:text-md"
      >
        {text}
      </label>
      {errorMessage && <p className="text-red-500 text-xs dark:text-red-400 ">{errorMessage}</p>}
    </div>
  );
}

export default Input;
