import { useState } from "react";
import { useNavigate } from "react-router-dom";
function Loginpage(){
    const navigator=useNavigate()
  const[error,setError]=useState("")
    const [email,setEmail]=useState("")
    const [password,setPassword]=useState("")
async function submitValue(e) {
    e.preventDefault()
    if(!email||!password){
return console.log("need details")
    }
    console.log(email)
    console.log(password)
 const response = await fetch(
  "https://emp-backend.stackenzo.com/api/users/userLogin",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  }
);

console.log(response.status);

const data = await response.json();
console.log(data);
if(response.status==401){
    setError(data)
    return
}
if(response.status==200){
    localStorage.setItem("LoginToken",data.Logintoken)
    navigator("/Dashboard")
}
}
    return (
  <div className="min-h-screen bg-gradient-to-br from-orange-100 via-white to-orange-200 flex items-center justify-center px-4">
    <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl p-8">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold text-orange-600">
          Stackenzo
        </h1>
        <p className="text-gray-500 mt-2 text-center">
          Employee Attendance Management System
        </p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={submitValue}>
        <div>
          <label className="block text-orange-600 font-semibold mb-2">
            Email
          </label>
          <input
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition"
            placeholder="******@stackenzo.com"
            type="email"
            required
          />
        </div>

        <div>
          <label className="block text-orange-600 font-semibold mb-2">
            Password
          </label>
          <input
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition"
            placeholder="********"
            type="password"
            required
          />
        </div>

        {error && (
          <div className="bg-red-100 text-red-600 rounded-lg p-3 text-center">
            {error.message}
          </div>
        )}

        <button
          type="submit"
          className="bg-orange-600 text-white p-3 rounded-xl font-bold text-lg hover:bg-orange-700 transition duration-300 shadow-lg"
        >
          Login
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Stackenzo. All rights reserved.
      </div>
    </div>
  </div>
);
}
export default Loginpage;