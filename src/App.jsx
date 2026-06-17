import { useState } from 'react'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Notifications from './notifications';
import AdminDashboard from './adminDashboard';
import Loginpage from './loginPage';
import Dashboard from './dashboard';
import Register from './register';
import './App.css'

function App() {


  return (
   <BrowserRouter>
   <Routes>
   <Route path='/login' element={<Loginpage/>}/>
   <Route path='/notifications' element={<Notifications/>}/>
   <Route path='/Admin' element={<AdminDashboard/>}/>
   <Route path='/Dashboard' element={<Dashboard/>}/>
   <Route path='/registerUser' element={<Register/>}/>
   </Routes>
   </BrowserRouter>
  )
}

export default App;
