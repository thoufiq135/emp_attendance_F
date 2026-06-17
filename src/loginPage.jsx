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
    return(
       <>
  <div className="h-[50vh] w-[30vw] bg-[#DCCFC0] mt-[150px] ml-[525px] rounded-2xl flex items-center justify-center">
    <form className="flex flex-col gap-4 w-[80%]" onSubmit={submitValue}>
      <label className="text-orange-600 font-bold">
        Email
      </label>
      <input
      onChange={(e)=>setEmail(e.target.value)}
        className="border rounded-md p-2"
        placeholder="******@stackenzo.com"
        type="email"
        required
      />
      <label className="text-orange-600 font-bold">
        Password
      </label>
      <input
      onChange={(e)=>setPassword(e.target.value)}
        className="border rounded-md p-2"
        placeholder="*******"
        type="password"
        required
      />
     <button
  type="submit"
  className="bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-700 transition duration-300"
  onClick={submitValue}
>
  Submit
</button>
    </form>
  </div>
</>
    )
}
export default Loginpage;