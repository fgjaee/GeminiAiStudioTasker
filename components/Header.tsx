// components/Header.tsx
import React from 'react';
import { Zap, Calendar, Users, ClipboardList, ListOrdered, Database, Settings, CalendarCheck, FileText, Image } from 'lucide-react';
import Button from './Button'; // Assuming Button component exists

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'assignments', label: 'Assignments', icon: Zap },
    { id: 'planner', label: 'Planner', icon: CalendarCheck }, // New Planner tab
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList },
    { id: 'rules', label: 'Rules', icon: ListOrdered },
    { id: 'review', label: 'Review', icon: FileText }, // Changed icon to FileText for Review
    { id: 'image-analysis', label: 'Image Analysis', icon: Image },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'data-architecture', label: 'Data Architecture', icon: Database },
  ];

  return (
    <header className="bg-card shadow-md">
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">WorkList Automator</h1>
        <div className="flex space-x-2 md:space-x-4">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className="flex items-center"
            >
              <tab.icon size={18} className="mr-1 hidden sm:inline" />
              <span className="text-xs sm:text-sm">{tab.label}</span>
            </Button>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Header;
