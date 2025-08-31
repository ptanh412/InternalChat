import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AlertContext = createContext();

export const ALERT_TYPES = {
    SUCCESS: "success",
    ERROR: "error",
    WARNING: "warning",
    INFO: "info",
}

export const AlertProvider = ({ children }) => {
    const [alerts, setAlerts] = useState([]);
    const navigate = useNavigate();
    const showAlert = (message, type = ALERT_TYPES.INFO, duration = 3000) => {
        const id = Date.now();

        setAlerts(prevAlerts => [...prevAlerts, { id, message, type }]);

        setTimeout(() => {
            removeAlert(id);
        }, duration);
    }

    const removeAlert = (id) => {
        setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
    };

    const navigateWithAlert = useCallback((path, message, type = ALERT_TYPES.INFO, duration = 3000) => {
        sessionStorage.setItem('pengindAlert', JSON.stringify({
            message,
            type,
            duration
        }));
        navigate(path);
    }, [navigate]);

    useEffect(() => {
        const checkPendingAlert = () => {
            const pendingAlert = sessionStorage.getItem('pengindAlert');

            if (pendingAlert){
                try{
                    const { message, type, duration } = JSON.parse(pendingAlert);
                    showAlert(message, type, duration);
                    sessionStorage.removeItem('pengindAlert');
                }catch (error) {
                    console.error("Error parsing pending alert:", error);
                    sessionStorage.removeItem('pengindAlert');
                }
            }
        };
        checkPendingAlert();
    },[showAlert]);

    const value = {
        alerts,
        showAlert,
        removeAlert,
        navigateWithAlert
    }
    return (
        <AlertContext.Provider value={value}>
            {children}
            <AlertContainer />
        </AlertContext.Provider>
    )
};

export const useAlert = () => {
    const context = useContext(AlertContext);

    if (!context) {
        throw new Error("useAlert must be used within an AlertProvider");
    }
    return context;
}

const AlertContainer = () => {
    const { alerts, removeAlert } = useAlert();

    if (alerts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-4 max-w-md">
            {alerts.map(alert => (
                <Alert key={alert.id} alert={alert} onClose={() => removeAlert(alert.id)} />
            ))}
        </div>
    )
}

const Alert = ({ alert, onClose }) => {
    const { id, message, type, duration = 3000 } = alert;

    const getAlertStyles = () => {
        switch (type) {
            case ALERT_TYPES.SUCCESS:
                return {
                    containerClass: 'bg-green-50 shadow-green-300 border-t-4',
                    iconColor: 'text-green-500',
                    progressBarColor: 'bg-green-500',
                    icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ),
                    headerClass: 'text-green-800',
                    textClass: 'text-green-700',
                    headerText: 'Success',
                }
            case ALERT_TYPES.ERROR:
                return {
                    containerClass: 'bg-red-50 shadow-red-300  border-t-4',
                    iconColor: 'text-red-500',
                    progressBarColor: 'bg-red-500',
                    icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ),
                    headerClass: 'text-red-800',
                    textClass: 'text-red-700',
                    headerText: 'Error',
                }
            case ALERT_TYPES.WARNING:
                return {
                    containerClass: 'bg-yellow-50 shadow-yellow-300 border-t-4 ',
                    iconColor: 'text-yellow-500',
                    progressBarColor: 'bg-yellow-500',
                    icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    ),
                    headerClass: 'text-yellow-800',
                    textClass: 'text-yellow-700',
                    headerText: 'Warning',
                }
            case ALERT_TYPES.INFO:
                return {
                    containerClass: 'bg-blue-50 shadow-blue-300 border-t-4',
                    iconColor: 'text-blue-500',
                    progressBarColor: 'bg-blue-500',
                    icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),                    headerClass: 'text-blue-800',
                    textClass: 'text-blue-700',
                    headerText: 'Info',
                };
            default:
                return {
                    containerClass: 'bg-gray-50 shadow-gray-300 border-t-4',
                    iconColor: 'text-gray-500',
                    progressBarColor: 'bg-gray-500',
                    icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    headerClass: 'text-gray-800',
                    textClass: 'text-gray-700',
                    headerText: 'Alert',
                };
        }
    };

    const styles = getAlertStyles();

    return (
        <div className="relative animate-fade-in">
            <div className={`${styles.containerClass} p-4 rounded-lg shadow-md min-w-64  flex items-start`}>
                <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden rounded-t-lg">
                    <div
                        className={`${styles.progressBarColor} h-full animate-shrink-from-right`}
                        style={{ '--duration': `${duration / 1000}s` }}
                    />
                </div>
                <div className={`flex-shrink-0 ${styles.iconColor}`}>
                    {styles.icon}
                </div>
                <div className="ml-3 flex-1">
                    <div className={`text-sm font-medium ${styles.headerClass}`}>
                        {styles.headerText}
                    </div>

                    <div className={`mt-1 text-sm ${styles.textClass}`}>
                        {message}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="ml-auto flex-shrink-0 text-neutral-400 hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500 rounded-md p-1 transition duration-150 ease-in-out"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>

    )
};
export default AlertContext;