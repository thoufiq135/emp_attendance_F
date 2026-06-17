import { useEffect, useState } from "react";

function Register() {
  const [heads, setHeads] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [deptData, setDeptData] = useState({
    deptName: "",
    deptId: "",
    headId: "",
  });

  const [userData, setUserData] = useState({
    Name: "",
    Email: "",
    mobile_no: "",
    Role: "",
    Department: "",
    password: "",
  });

  useEffect(() => {
    fetchHeads();
    fetchDepartments();
  }, []);

  async function fetchHeads() {
    const res = await fetch("http://localhost:3000/getHeads");
    const data = await res.json();
    setHeads(data);
  }

  async function fetchDepartments() {
    const res = await fetch("http://localhost:3000/getDepartments");
    const data = await res.json();
    setDepartments(data);
  }

  async function createDepartment(e) {
    e.preventDefault();

    const response = await fetch("http://localhost:3000/addDepartment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deptData),
    });

    const data = await response.json();
    alert(data.message);

    fetchDepartments();
  }

  async function createUser(e) {
    e.preventDefault();

    const response = await fetch("http://localhost:3000/createUser", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    alert(data.message);
  }

  return (
    <div>
      <h2>Create Department</h2>

      <form onSubmit={createDepartment}>
        <input
          placeholder="Department Name"
          value={deptData.deptName}
          onChange={(e) =>
            setDeptData({ ...deptData, deptName: e.target.value })
          }
        />

        <input
          placeholder="Department ID"
          value={deptData.deptId}
          onChange={(e) =>
            setDeptData({ ...deptData, deptId: e.target.value })
          }
        />

        <select
          value={deptData.headId}
          onChange={(e) =>
            setDeptData({ ...deptData, headId: e.target.value })
          }
        >
          <option value="">Select Head</option>

          {heads.map((head) => (
            <option key={head._id} value={head._id}>
              {head.Name}
            </option>
          ))}
        </select>

        <button>Create Department</button>
      </form>

      <hr />

      <h2>Create User</h2>

      <form onSubmit={createUser}>
        <input
          placeholder="Name"
          onChange={(e) =>
            setUserData({ ...userData, Name: e.target.value })
          }
        />

        <input
          placeholder="Email"
          onChange={(e) =>
            setUserData({ ...userData, Email: e.target.value })
          }
        />

        <input
          placeholder="Mobile"
          onChange={(e) =>
            setUserData({ ...userData, mobile_no: e.target.value })
          }
        />

        <input
          placeholder="Password"
          type="password"
          onChange={(e) =>
            setUserData({ ...userData, password: e.target.value })
          }
        />

        <select
          onChange={(e) =>
            setUserData({ ...userData, Role: e.target.value })
          }
        >
          <option value="">Select Role</option>
          <option value="employee">Employee</option>
          <option value="head">Head</option>
          <option value="admin">Admin</option>
        </select>

        <select
          onChange={(e) =>
            setUserData({ ...userData, Department: e.target.value })
          }
        >
          <option value="">Select Department</option>

          {departments.map((dept) => (
            <option key={dept._id} value={dept.Department}>
              {dept.Department}
            </option>
          ))}
        </select>

        <button>Create User</button>
      </form>
    </div>
  );
}

export default Register;