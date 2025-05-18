import React from "react";

function FormInput({ id, label, placeholder, value, onChange }) {
  return (
    <div className="formGroup">
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
    </div>
  );
}

export default FormInput;