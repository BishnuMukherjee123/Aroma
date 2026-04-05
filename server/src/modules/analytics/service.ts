export const recordPublicRestaurantView = async (input: {
  publicId: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> => {
  console.log("public-restaurant-view", input);
};
