import { Clipboard, showToast, Toast, open } from "@raycast/api";

export default async function Command() {
  const rawEin = (await Clipboard.readText() || "").trim();

  // 🐞 Debug log: outputs what's in your clipboard
  console.log("📋 Raw clipboard:", JSON.stringify(rawEin));

  // Check if clipboard is empty
  if (!rawEin) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Empty Clipboard",
      message: "Please copy an EIN to your clipboard first",
    });
    return;
  }

  const cleanEin = rawEin.replace(/\D/g, "");

  if (cleanEin.length !== 9) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid EIN Format",
      message: `Found ${cleanEin.length} digits, but EIN must be exactly 9 digits`,
    });
    return;
  }

  // Format EIN with hyphen for display (XX-XXXXXXX)
  const formattedEin = `${cleanEin.substring(0, 2)}-${cleanEin.substring(2)}`;
  
  await showToast({
    style: Toast.Style.Animated,
    title: "Checking EIN...",
    message: `Validating ${formattedEin} with IRS database`,
  });

  const url = `https://apps.irs.gov/prod-east/teos/searchAll/ein?ein=${cleanEin}&country=US&rows=25&page=0&sortBy=name&flow=asc`;
  const irsPublicUrl = `https://apps.irs.gov/app/eos/detailsPage?ein=${cleanEin}&name=&city=&state=All...&country=US&deductibility=all&dispatchMethod=searchAll&type=&orgTags=&fromSearch=true`;

  try {
    const res = await fetch(url);
    
    // Check for network errors
    if (!res.ok) {
      throw new Error(`Network response error: ${res.status} ${res.statusText}`);
    }
    
    const json = await res.json();

    if (json.message === "success" && json.count > 0) {
      const org = json.items[0];
      const toast = await showToast({
        style: Toast.Style.Success,
        title: "✅ Yes, it's a valid nonprofit!",
        message: `${org.name} (${org.city}, ${org.state})`,
        primaryAction: {
          title: "View on IRS Website",
          onAction: () => {
            open(irsPublicUrl);
          },
        },
      });
      
      // Wait for user to click the action or dismiss the toast
      await toast.await();
    } else if (json.message === "success" && json.count === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not Found",
        message: `EIN ${formattedEin} isn't listed in the IRS database.`,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unexpected Response",
        message: `Error: ${json.message || "Unknown error"}`,
      });
    }
  } catch (error) {
    console.error("Error fetching EIN data:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Request Failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
