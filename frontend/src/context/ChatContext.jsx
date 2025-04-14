import { createContext, useState, useContext, useEffect } from 'react';

const ChatContext = createContext();

export const ChatContextProvider =({ children}) => {
    const savedComponent = localStorage.getItem('currentComponent') || 'ConversationList';
    const [currentComponent, setCurrentComponent] = useState(savedComponent);

    useEffect(() => {
        localStorage.setItem('currentComponent', currentComponent);
    },[currentComponent]);

    return (
        <ChatContext.Provider value={{ currentComponent, setCurrentComponent }}>
            {children}
        </ChatContext.Provider>
    )
}

export const useChatContext = () => {
    return useContext(ChatContext);
}