import React from 'react';
import { Home, Users, ClipboardList, Gavel, Calendar, Archive, Settings, Layout, Speech } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { name: 'Planner', icon: <Home size={18} />, key: 'planner' },
    { name: 'Assignments', icon: <Archive size={18} />, key: 'assignments' },
    { name: 'Members', icon: <Users size={18} />, key: 'members' },
    { name: 'Tasks', icon: <ClipboardList size={18} />, key: 'tasks' },
    { name: 'Rules', icon: <Gavel size={18} />, key: 'rules' },
    { name: 'Schedule', icon: <Calendar size={18} />, key: 'schedule' },
    { name: 'Review', icon: <Speech size={18} />, key: 'review' },
    { name: 'Settings', icon: <Settings size={18} />, key: 'settings' },
    { name: 'Architecture', icon: <Layout size={18} />, key: 'architecture' },
  ];

  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto p-4 flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-2xl font-bold mb-4 sm:mb-0">Worklist Automator</h1>
        <nav>
          <ul className="flex flex-wrap justify-center sm:justify-end space-x-2 sm:space-x-4">
            {tabs.map((tab) => (
              <li key={tab.key}>
                <button
                  onClick={() => onTabChange(tab.key)}
                  className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                    activeTab === tab.key ? 'bg-blue-700 font-semibold' : 'hover:bg-blue-600'
                  }`}
                >
                  {tab.icon}
                  <span className="ml-2 hidden md:inline">{tab.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;