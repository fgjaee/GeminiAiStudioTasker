
import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  id: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, id, className, ...props }) => {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-textdark mb-1">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 bg-card ${className}`}
        rows={props.rows || 3}
        {...props}
      />
    </div>
  );
};

export default Textarea;