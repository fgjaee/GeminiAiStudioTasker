import React from 'react';
import { Zap, Calendar, Users, ClipboardList, Database, Settings, MessageSquareText, ListOrdered } from 'lucide-react'; // Added ListOrdered

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'assignments', label: 'Assignments', icon: Zap },
    { id: 'review', label: 'Review', icon: MessageSquareText },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList },
    { id: 'rules', label: 'Rules', icon: ListOrdered }, // Changed icon for rules
    { id: 'dataArchitecture', label: 'Data Architecture', icon: Database }, // New tab with Database icon
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="bg-card shadow-sm py-4 px-6 fixed top-0 left-0 right-0 z-10">
      <div className="container mx-auto flex flex-wrap justify-between items-center">
        <h1 className="text-2xl font-bold text-primary mb-4 md:mb-0">WorkList Automator</h1>
        <nav className="flex flex-wrap space-x-2 sm:space-x-4">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                  ${isActive ? 'bg-primary text-white shadow' : 'text-gray-600 hover:bg-gray-100 hover:text-primary'}
                `}
              >
                <tab.icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Header;
