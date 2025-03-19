// context/ThemeContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useUser } from './UserContext';
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(true);
  const {user} = useUser();

  useEffect(() => {
    const fetchTheme = async () =>{
      if (user && user._id){
        try{
          setLoading(true);

          const response = await axios.get(`http://localhost:5000/api/userSetting/${user._id}`,{
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

          if (response.data.success && response.data.data){
            setTheme(response.data.data.theme);
          }
        }catch(error){
          console.error('Error fetching theme', error);
        }finally{
          setLoading(false);
        }
      }else{
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme){
          setTheme(savedTheme);
        }
        setLoading(false);
      }
    };
    fetchTheme();
  }, [user]);

  useEffect(() => {
    if (theme === 'dark'){
      document.documentElement.classList.add('dark');
    }else{
      document.documentElement.classList.remove('dark');
    }

    if (!user || !loading){
      localStorage.setItem('theme', theme);
    }
  }, [theme, loading, user]);

  const toggleTheme = async () =>{
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

    console.log('theme', newTheme);

    if (user && user._id){
      try{
        await axios.put(`http://localhost:5000/api/userSetting/${user._id}`, { theme: newTheme },{
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
      }catch(error){
        console.error('Error updating theme', error);
      }
    }
  }
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, loading }}>
      {loading ? <div>Loading theme...</div>: children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);