interface DownAlertParams {
  productName: string;
  url: string;
  status: "down" | "error";
  error: string | null;
  productId: string;
}

export function downAlertEmailHtml({ productName, url, status, error, productId }: DownAlertParams) {
  const statusLabel = status === "down" ? "DOWN" : "ERROR";
  const statusColor = status === "down" ? "#ef4444" : "#f59e0b";

  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #f4f4f5; padding: 32px 16px;">
    <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #18181b; padding: 20px 24px;">
        <span style="color: #f97316; font-weight: 700; font-size: 16px;">Ares</span>
        <span style="color: #a1a1aa; font-size: 13px; margin-left: 8px;">Uptime Monitor</span>
      </div>

      <div style="padding: 28px 24px;">
        <span style="display: inline-block; background: ${statusColor}; color: #ffffff; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 999px; margin-bottom: 16px;">
          ${statusLabel}
        </span>

        <h1 style="font-size: 20px; margin: 0 0 6px; color: #18181b;">${productName}</h1>
        <p style="margin: 0 0 20px; font-size: 14px; color: #71717a; word-break: break-all;">${url}</p>

        ${
          error
            ? `<div style="background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; margin-bottom: 24px;">
                 <p style="margin: 0; font-size: 13px; color: #52525b; font-family: monospace;">${error}</p>
               </div>`
            : ""
        }

        <a href="https://ares.theerrv.com/products/${productId}"
           style="display: inline-block; background: #f97316; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 8px;">
          View in Ares →
        </a>
      </div>

      <div style="border-top: 1px solid #e5e7eb; padding: 14px 24px;">
        <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
          Automated alert from Ares — Theerrv Technologies
        </p>
      </div>
    </div>
  </div>
  `;
}

interface DomainExpiryParams {
  productName: string;
  domain: string;
  daysLeft: number;
  productId: string;
}

export function domainExpiryEmailHtml({ productName, domain, daysLeft, productId }: DomainExpiryParams) {
  const expired = daysLeft < 0;
  const statusLabel = expired ? `EXPIRED ${Math.abs(daysLeft)}D AGO` : `${daysLeft}D LEFT`;
  const statusColor = expired ? "#ef4444" : daysLeft <= 3 ? "#ef4444" : "#f59e0b";

  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #f4f4f5; padding: 32px 16px;">
    <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #18181b; padding: 20px 24px;">
        <span style="color: #f97316; font-weight: 700; font-size: 16px;">Ares</span>
        <span style="color: #a1a1aa; font-size: 13px; margin-left: 8px;">Domain Watch</span>
      </div>

      <div style="padding: 28px 24px;">
        <span style="display: inline-block; background: ${statusColor}; color: #ffffff; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 999px; margin-bottom: 16px;">
          ${statusLabel}
        </span>

        <h1 style="font-size: 20px; margin: 0 0 6px; color: #18181b;">${productName}</h1>
        <p style="margin: 0 0 20px; font-size: 14px; color: #71717a;">${domain}</p>

        <div style="background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 13px; color: #52525b;">
            ${
              expired
                ? `This domain expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago. Renew it as soon as possible.`
                : `This domain expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Renew it before it lapses.`
            }
          </p>
        </div>

        <a href="https://ares.theerrv.com/products/${productId}"
           style="display: inline-block; background: #f97316; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 8px;">
          View in Ares →
        </a>
      </div>

      <div style="border-top: 1px solid #e5e7eb; padding: 14px 24px;">
        <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
          Automated alert from Ares — Theerrv Technologies
        </p>
      </div>
    </div>
  </div>
  `;
}
