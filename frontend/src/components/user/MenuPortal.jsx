import ReactDOM from 'react-dom';

const MenuPortal = ({ children, isOpen }) => {
  if (!isOpen) return null;
  
  return ReactDOM.createPortal(
    children,
    document.body  // This renders the menu directly to the body, escaping stacking contexts
  );
};

export default MenuPortal;