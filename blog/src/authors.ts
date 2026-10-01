export interface Author {
  id: string;
  name: string;
  avatar: string;
  url?: string;
  bio?: string;
  role?: string;
}

export const authors: Record<string, Author> = {
  paryx: {
    id: 'paryx',
    name: 'paryx',
    avatar: '/assets/logo_white.svg',
    url: 'https://paryx.uk',
    role: 'Developer & creator',
    bio: 'Building useful tools and exploring what comes next.',
  },
};
