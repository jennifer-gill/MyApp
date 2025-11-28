// utils/fetchData.js
export const fetchWeeklyActivity = async () => {
  try {
    const response = await fetch(
      "https://activ-io.com/Crm/engineer-tracker/checkins-list.php"
    );
    const json = await response.json();

    if (json.status !== "success") return [];

    const data = json.data;

    // Map data to weekly activity per user
    const weeklyData = {};

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday start

    data.forEach((item) => {
      const checkInDate = new Date(item.check_in_time);
      if (checkInDate >= startOfWeek) {
        if (!weeklyData[item.username]) weeklyData[item.username] = 0;
        weeklyData[item.username] += 1; // increment each check-in
      }
    });

    // Convert to array suitable for chart labels and values
    const labels = Object.keys(weeklyData);
    const values = Object.values(weeklyData);

    return { labels, values };
  } catch (error) {
    console.error("Failed to fetch weekly activity:", error);
    return { labels: [], values: [] };
  }
};
