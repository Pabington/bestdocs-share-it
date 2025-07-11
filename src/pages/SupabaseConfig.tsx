import { SupabaseConfigInstructions } from '@/components/auth/SupabaseConfigInstructions';

const SupabaseConfig = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <SupabaseConfigInstructions />
    </div>
  );
};

export default SupabaseConfig;