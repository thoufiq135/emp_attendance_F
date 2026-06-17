import { useState } from 'react'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import {Takeattendance} from './TakeAttendance';
import {AdminDashboard} from './adminDashboard';
import Loginpage from './loginPage';
import {Dashboard }from './dashboard';
import './App.css'

function App() {


  return (
   <BrowserRouter>
   <Routes>
   <Route path='/login' element={<Loginpage/>}/>
   <Route path='/Attendance' element={<Takeattendance/>}/>
   <Route path='/Admin' element={<AdminDashboard/>}/>
   <Route path='/Dashboard' element={<Dashboard/>}/>
   </Routes>
   </BrowserRouter>
  )
}

export default App;
