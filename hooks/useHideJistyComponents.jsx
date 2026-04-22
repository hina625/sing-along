import React, { useEffect } from 'react'

const useHideJistyComponents = () => {


    function hideNameInput(){
        const setInterValRef = setInterval(() => {
            const inputRef = document.querySelector(".css-1m7m6m3-fieldContainer")
            if(inputRef){
                clearInterval(setInterValRef);
                console.log(inputRef,"inputref")
            }
            console.log(inputRef,"inputref")
        },100)
    }

    useEffect(() => {
        // hideNameInput();
    },[])
  return (
    {}
  )
}

export default useHideJistyComponents