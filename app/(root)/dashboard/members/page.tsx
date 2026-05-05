'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import Loader from '@/components/Loader';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl: string;
  lastSignInAt: number;
}

const MembersPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await axios.get('/api/v1/members');
        if (res.data.success) {
          setMembers(res.data.members);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  if (loading) return <Loader />;

  return (
    <section className='flex size-full flex-col gap-10 text-white'>
      <div className="flex items-center justify-center flex-col mt-24 mb-16">
        <h2 className="mt-4 text-4xl sm:text-5xl md:text-6xl !text-white font-bold">
          Members
        </h2>
        <p className="text-xl text-white/70 mt-4">Connect with our growing community of worshippers.</p>
      </div>
      
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4 pb-12'>
        {members.length > 0 ? (
          members.map((member) => (
            <div key={member.id} className='bg-background-3/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4 transition-all hover:scale-[1.02] hover:bg-background-3/60'>
              <div className='relative w-20 h-20 rounded-full overflow-hidden border-2 border-orange-500/50'>
                <Image 
                  src={member.imageUrl || '/images/avatar-1.jpeg'} 
                  alt={member.firstName || 'Member'} 
                  fill
                  className='object-cover'
                />
              </div>
              <div className='text-center'>
                <h3 className='text-xl font-bold text-white'>
                  {member.firstName} {member.lastName}
                </h3>
                <p className='text-white/50 text-sm truncate max-w-[200px]'>
                  {member.email}
                </p>
              </div>
              <div className='mt-2 py-1 px-3 bg-white/5 rounded-full border border-white/10'>
                <span className='text-[10px] uppercase tracking-widest text-orange-400 font-bold'>Member</span>
              </div>
            </div>
          ))
        ) : (
          <div className='col-span-full flex items-center justify-center min-h-[300px] border-2 border-dashed border-white/20 rounded-xl'>
            <p className='text-white/50 text-2xl'>No members found yet.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default MembersPage;
