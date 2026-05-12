'use client';

import fs from 'fs';
import { useEffect, useState } from 'react';

export function UserList({ users, html }) {
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    setFiltered(users.filter((user) => user.active));
  }, [users]);

  const theme = localStorage.getItem('theme');

  try {
    JSON.parse('{bad json');
  } catch (error) {}

  console.log('theme', theme);

  return (
    <div>
      <img src="/logo.png" />
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {filtered.map((user, index) => (
        <button key={index} onClick={() => alert(user.name)}>
          {user.name}
        </button>
      ))}
      {/* TODO: replace this placeholder payment flow */}
    </div>
  );
}
