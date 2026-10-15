/*
  Customer reviews from the design (placeholder text until real reviews are available), shared by
  the landing page slider ("Where Goodness Gets a Voice") and the /reviews page.
  Each reviewer has an illustrated avatar (reviewer-avatar.tsx), not a photo of a real person,
  because the reviews are placeholders.
*/

export type ReviewerAvatarLook = {
  gender: "female" | "male";
  skinTone: string;
  backgroundColour: string;
  clothesColour: string;
  // Women: long hair or a bun; men: with or without a moustache
  hairStyle: "long" | "bun" | "short";
  hasMoustache?: boolean;
};

export type CustomerReview = {
  id: string;
  reviewerName: string;
  reviewerPlace: string;
  rating: number;
  reviewText: string;
  avatar: ReviewerAvatarLook;
};

export const customerReviews: CustomerReview[] = [
  {
    id: "roshan",
    reviewerName: "Roshan",
    reviewerPlace: "#1505, Satva groups",
    rating: 4.9,
    reviewText:
      "The milk tastes fresh and wholesome. We love the quality, and it has become a lovely part of our family's daily routine.",
    avatar: {
      gender: "male",
      skinTone: "#9a6440",
      backgroundColour: "#e3eedc",
      clothesColour: "#2f6b3f",
      hairStyle: "short",
      hasMoustache: true,
    },
  },
  {
    id: "ananya-r",
    reviewerName: "Ananya R",
    reviewerPlace: "Prestrige",
    rating: 4.9,
    reviewText:
      "The ghee has a wonderful aroma and rich taste. It reminds me of the traditional homemade ghee I grew up with.",
    avatar: {
      gender: "female",
      skinTone: "#b07a52",
      backgroundColour: "#fdf0d2",
      clothesColour: "#c0392b",
      hairStyle: "long",
    },
  },
  {
    id: "rahul",
    reviewerName: "Rahul",
    reviewerPlace: "Shobha",
    rating: 5.0,
    reviewText:
      "We enjoy the freshness and creamy texture of the dairy products. Chiranvi Farm brings a traditional touch to our everyday meals.",
    avatar: {
      gender: "male",
      skinTone: "#8a5634",
      backgroundColour: "#e1ebf7",
      clothesColour: "#3a6ea5",
      hairStyle: "short",
    },
  },
  {
    id: "sneha",
    reviewerName: "Sneha",
    reviewerPlace: "Mahaveer",
    rating: 4.8,
    reviewText:
      "The paneer works beautifully in our homemade dishes. We appreciate having quality dairy products for family meals.",
    avatar: {
      gender: "female",
      skinTone: "#a8704a",
      backgroundColour: "#f6e3ea",
      clothesColour: "#8e44ad",
      hairStyle: "bun",
    },
  },
  {
    id: "karthik",
    reviewerName: "Karthik",
    reviewerPlace: "D S Max",
    rating: 4.9,
    reviewText:
      "I love the traditional feel of the products. The butter tastes delicious on toast and adds a lovely richness to breakfast.",
    avatar: {
      gender: "male",
      skinTone: "#7d4b2c",
      backgroundColour: "#fdf0d2",
      clothesColour: "#d68910",
      hairStyle: "short",
      hasMoustache: true,
    },
  },
  {
    id: "arjun-n",
    reviewerName: "Arjun N",
    reviewerPlace: "Century Park",
    rating: 4.9,
    reviewText:
      "I appreciate the care that goes into presenting the products. It makes choosing dairy for our home feel more personal.",
    avatar: {
      gender: "male",
      skinTone: "#a06a44",
      backgroundColour: "#e3eedc",
      clothesColour: "#5d6d7e",
      hairStyle: "short",
    },
  },
  {
    id: "divya-purvankara",
    reviewerName: "Divya",
    reviewerPlace: "Purvankara",
    rating: 4.7,
    reviewText:
      "From milk to ghee, the products bring a familiar taste of traditional dairy to our home. It is a brand we enjoy exploring.",
    avatar: {
      gender: "female",
      skinTone: "#8f5a36",
      backgroundColour: "#e1ebf7",
      clothesColour: "#16a085",
      hairStyle: "long",
    },
  },
  {
    id: "nisha",
    reviewerName: "Nisha",
    reviewerPlace: "Casa grand",
    rating: 4.8,
    reviewText: "We enjoy serving it to the whole family. It pairs perfectly with coffee, tea, and cereals.",
    avatar: {
      gender: "female",
      skinTone: "#b8835c",
      backgroundColour: "#fdf0d2",
      clothesColour: "#e67e22",
      hairStyle: "bun",
    },
  },
  {
    id: "vinod",
    reviewerName: "Vinod",
    reviewerPlace: "Green Valley",
    rating: 4.9,
    reviewText: "The aroma of ghee brings back childhood memories. It adds a beautiful flavour to traditional recipes.",
    avatar: {
      gender: "male",
      skinTone: "#82502f",
      backgroundColour: "#f6e3ea",
      clothesColour: "#2f6b3f",
      hairStyle: "short",
      hasMoustache: true,
    },
  },
  {
    id: "pooja",
    reviewerName: "Pooja",
    reviewerPlace: "Prime City Apartments",
    rating: 4.9,
    reviewText:
      "Paneer is a favourite in our family. It works well in curries and quick snacks. We enjoy preparing different dishes with it.",
    avatar: {
      gender: "female",
      skinTone: "#a36b45",
      backgroundColour: "#e3eedc",
      clothesColour: "#c2185b",
      hairStyle: "long",
    },
  },
  {
    id: "aditya",
    reviewerName: "Aditya",
    reviewerPlace: "Brigade Gardenia",
    rating: 5.0,
    reviewText:
      "The creamy taste makes breakfast more enjoyable. We love spreading it on warm toast. Works good in our favourite recipes.",
    avatar: {
      gender: "male",
      skinTone: "#b07a52",
      backgroundColour: "#e1ebf7",
      clothesColour: "#1f3a5f",
      hairStyle: "short",
    },
  },
  {
    id: "divya-svasa-homes",
    reviewerName: "Divya",
    reviewerPlace: "Svasa Homes",
    rating: 4.9,
    reviewText:
      "From milk to ghee, the products bring a familiar taste of traditional dairy to our home. It is a brand we enjoy exploring.",
    avatar: {
      gender: "female",
      skinTone: "#94603b",
      backgroundColour: "#f6e3ea",
      clothesColour: "#2f6b3f",
      hairStyle: "bun",
    },
  },
];
