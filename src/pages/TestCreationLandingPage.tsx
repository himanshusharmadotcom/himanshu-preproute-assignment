import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/common/Button';
import { Plus, ChevronRight } from 'lucide-react';

export const TestCreationLandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Test Creation</h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage your tests</p>
          </div>
          <Button variant="primary" onClick={() => navigate('/test-creation/create')}>
            <Plus size={16} className="mr-1.5" />
            Create Test
          </Button>
        </div>

        {/* Test tracking row */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-sm mb-4">
            <span
              className="font-medium text-[#4361EE] cursor-pointer hover:underline"
              onClick={() => navigate('/test-creation')}
            >
              Test Creation
            </span>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="text-gray-600">All Tests</span>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plus size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm mb-4">No tests yet. Create your first test.</p>
          <Button variant="primary" onClick={() => navigate('/test-creation/create')}>
            Create Test
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};
