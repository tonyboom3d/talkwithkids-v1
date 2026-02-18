import React from "react";

export default function Layout({ children }) {
  return (
    <div style={{ fontFamily: "'Assistant', 'Helvetica Neue', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;500;600;700;800&display=swap');
        
        * {
          font-family: 'Assistant', 'Helvetica Neue', sans-serif !important;
        }
        
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
      {children}
    </div>
  );
}