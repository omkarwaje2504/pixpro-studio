"use client"
import React from 'react';
import { ImSpinner3 } from "react-icons/im";

function loading() {
  return (
    <div className='w-full h-screen flex items-center justify-center'>
        <ImSpinner3 className='animate-spin text-4xl dark:fill-white'/>
    </div>
  )
}

export default loading