"use client"


import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { useEffect } from 'react';
import { useState } from 'react';
import {createContext} from 'react'

export const subscriptionContext = createContext();



export const SubcriptionProvider = ({children}) => {
    const [subscription, setSubscription] = useState('free');
    const [details, setdetails] = useState({});
    const { user, isLoaded } = useUser();


    useEffect(() => {
        if (!isLoaded || !user) return;
        
        axios.get(`/api/v1/subscription?user_id=${user?.id}`).then(res => {
            setSubscription(res.data?.plan)
            setdetails(res.data?.details)
        });
        
      }, [user, isLoaded]);
    return <subscriptionContext.Provider value={{subscription,setSubscription,details}}>
        {children}
    </subscriptionContext.Provider>
}