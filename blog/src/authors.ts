export interface Author {
  id: string;
  name: string;
  avatar: string;
  url?: string;
  bio?: string;
  role?: string;
  projects?: { name: string; url: string }[];
}

export const authors: Record<string, Author> = {
  paryx: {
    id: 'paryx',
    name: 'paryx',
    avatar: '/assets/logo_white.svg',
    url: 'https://paryx.uk',
    role: 'Developer & creator',
    projects: [
      { name: 'Projects on GitHub', url: 'https://github.com/Paryx-games' },
    ],
    bio: 'Building useful tools and exploring what comes next.',
  },
};
