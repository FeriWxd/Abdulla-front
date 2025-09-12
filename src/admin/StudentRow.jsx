import React from "react";
import "../style/StudentRow.css"; // Assuming you have a CSS file for styling the row
const StudentRow = ({ student }) => {
  return (
    <div className="student-row">
      <span>
        {student.firstName} {student.lastName}
      </span>
      <span>{student.username}</span>
      <span>{student.group}</span>
      <span>Average: {student.average}</span>
    </div>
  );
};

export default StudentRow;
