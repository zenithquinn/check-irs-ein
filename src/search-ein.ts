import { Clipboard, showToast, Toast } from "@raycast/api";

export default async function Command() {
  const rawEin = (await Clipboard.readText() || "").trim();

  // 🐞 Debug log: outputs what's in your clipboard
  console.log("📋 Raw clipboard:", JSON.stringify(rawEin));

  const cleanEin = rawEin.replace(/\D/g, "");

  if (cleanEin.length !== 9) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid EIN",
      message: "Clipboard must contain a 9-digit EIN",
    });
    return;
  }

  const url = `https://apps.irs.gov/prod-east/teos/searchAll/ein?ein=${cleanEin}&country=US&rows=25&page=0&sortBy=name&flow=asc`;

  try {
    const res = await fetch(url);
    const json = await res.json();

    if (json.message === "success" && json.count > 0) {
      const org = json.items[0];
      await showToast({
        style: Toast.Style.Success,
        title: "✅ Yes, it's a valid nonprofit!",
        message: `${org.name} (${org.city}, ${org.state})`,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Hmm… not found",
        message: "That EIN isn't listed in the IRS database.",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Request failed",
      message: String(error),
    });
  }
}
