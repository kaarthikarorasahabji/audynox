// Auth service — local mode, no external API calls needed
const fetchUser = async () => {
  return {
    data: {
      id: 'local-user',
      display_name: 'You',
      email: '',
      images: [],
      product: 'free',
      type: 'user',
      uri: 'local:user:you',
      followers: { total: 0 },
      country: '',
      external_urls: { spotify: '' },
    },
  };
};

export const authService = {
  fetchUser,
};
