// lib/chartColors.ts
// Shared color utility for consistent chart colors across the application

export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    // Essential Categories - Warm Colors
    Food: "#FF6B6B",              // Vibrant Red
    Dining: "#FF8E53",            // Orange Red
    Groceries: "#FF6B9D",         // Pink Red
    
    // Transportation - Cool Blues/Teals
    Transport: "#4ECDC4",         // Teal
    Gas: "#45B7D1",              // Sky Blue
    PublicTransport: "#96CEB4",   // Mint Green
    
    // Entertainment - Purple/Magenta Spectrum
    Entertainment: "#A8E6CF",     // Light Green
    Movies: "#DDA0DD",           // Plum
    Games: "#B19CD9",            // Light Purple
    
    // Utilities - Earth Tones
    Utilities: "#FFD93D",         // Golden Yellow
    Electric: "#6BCF7F",          // Green
    Water: "#4FC3F7",            // Light Blue
    Internet: "#FFB74D",         // Amber
    
    // Income - Green Spectrum
    Income: "#52C41A",           // Success Green
    Salary: "#7CB342",           // Olive Green
    Bonus: "#66BB6A",            // Medium Green
    
    // Shopping - Orange/Yellow Spectrum
    Shopping: "#FFA726",         // Orange
    Clothing: "#FF7043",         // Deep Orange
    Electronics: "#AB47BC",      // Purple
    
    // Health & Personal - Pink/Purple
    Healthcare: "#EC407A",       // Pink
    PersonalCare: "#BA68C8",     // Light Purple
    Pharmacy: "#F48FB1",         // Light Pink
    
    // Education - Blue Spectrum
    Education: "#42A5F5",        // Blue
    Books: "#5C6BC0",           // Indigo
    Courses: "#7986CB",         // Light Indigo
    
    // Travel - Vibrant Colors
    Travel: "#FF5722",           // Deep Orange
    Hotel: "#FF9800",           // Orange
    Flight: "#03DAC6",          // Cyan
    
    // Housing - Brown/Neutral Tones
    Housing: "#8D6E63",          // Brown
    Rent: "#A1887F",            // Light Brown
    Mortgage: "#BCAAA4",        // Very Light Brown
    
    // Financial - Professional Colors
    Investment: "#607D8B",       // Blue Grey
    Savings: "#009688",          // Teal
    Insurance: "#795548",        // Brown
    
    // Miscellaneous - Bright Accent Colors
    Gifts: "#E91E63",           // Pink
    Charity: "#9C27B0",         // Purple
    Pets: "#FF9E80",            // Light Orange
    
    // Account Types
    Checking: "#00BCD4",         // Cyan
    Credit: "#F44336",          // Red
    
    // Status Colors
    active: "#4CAF50",          // Green
    completed: "#2196F3",       // Blue
    paused: "#FF9800",          // Orange
    
    // Catch-all
    Other: "#9E9E9E",           // Grey
  };
  
  // If no specific color found, generate a color based on category name hash
  if (!colors[category]) {
    const fallbackColors = [
      "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FECA57", 
      "#FF9FF3", "#54A0FF", "#5F27CD", "#00D2D3", "#FF9F43",
      "#10AC84", "#EE5A24", "#0652DD", "#9C88FF", "#FFC312",
      "#C4E538", "#12CBC4", "#FDA7DF", "#ED4C67", "#F79F1F",
      "#A3CB38", "#1289A7", "#D63031", "#74B9FF", "#0984E3",
      "#6C5CE7", "#A29BFE", "#FD79A8", "#FDCB6E", "#E17055"
    ];
    
    // Simple hash function to consistently assign colors
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      const char = category.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return fallbackColors[Math.abs(hash) % fallbackColors.length];
  }
  
  return colors[category];
};

// Function to get colors for multiple categories, ensuring distinct colors
export const getCategoryColors = (categories: string[]): string[] => {
  return categories.map(category => getCategoryColor(category));
};

// Function to get color by index (for when you need sequential distinct colors)
export const getColorByIndex = (index: number): string => {
  const distinctColors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FECA57", 
    "#FF9FF3", "#54A0FF", "#5F27CD", "#00D2D3", "#FF9F43",
    "#10AC84", "#EE5A24", "#0652DD", "#9C88FF", "#FFC312",
    "#C4E538", "#12CBC4", "#FDA7DF", "#ED4C67", "#F79F1F",
    "#A3CB38", "#1289A7", "#D63031", "#74B9FF", "#0984E3",
    "#6C5CE7", "#A29BFE", "#FD79A8", "#FDCB6E", "#E17055"
  ];
  
  return distinctColors[index % distinctColors.length];
};

// Export default function for convenience
export default getCategoryColor;
