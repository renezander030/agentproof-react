'use client';

import { useMemo } from 'react';

export function UserList({ users, onSelectUser }) {
  const activeUsers = useMemo(() => users.filter((user) => user.active), [users]);

  return (
    <section aria-label="Active users">
      <img src="/logo.png" alt="Company logo" />
      {activeUsers.map((user) => (
        <button key={user.id} type="button" onClick={() => onSelectUser(user.id)}>
          {user.name}
        </button>
      ))}
    </section>
  );
}
