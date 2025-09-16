import React from 'react';
import { FaLine, FaInstagram, FaEnvelope, FaFacebook } from 'react-icons/fa';

const defaultNotes = [
  'example:',
  '2025年預購商品出貨時間：',
  '◎公仔＆御守，預計8~10月開始陸續出貨。',
  '◎服飾＆帽子，預計10月開始陸續出貨。',
  '◎滑鼠墊＆杯墊，預計9月開始陸續出貨。',
  '單筆訂單購買上限為NT$20,000，如超過金額請分次下單。',
  '同筆訂單商品皆為到齊後一起出貨，如欲購買其他現貨、訂製商品，需提早出貨，請分開下單。',
  '選擇線上付款之訂單，付款完成後請務必再次檢查訂單狀態是否付款成功。如未付款完成視同【訂單未成立】，系統將自動取消訂單。',
  '海外地區寄送運費依地區與金額酌收不同費用，實際運費以結帳金額為準。',
  '訂購後無法更改訂單內容，如需更換尺寸或款式，請取消訂單重新下訂。',
  '海外收件資訊（除中港澳外）僅接收英文，請填寫正確英文姓名與地址。',
  '海外電話請在最前面加「+國碼」，例如 +86、+65 等。',
  '開箱請全程錄影（不得剪輯），如無錄影發生損傷或缺件，恕無法提供售後服務。',
  '【防詐騙提醒】我們不會主動電話詢問訂單相關資訊，請小心留意！',
];

const defaultLinks = [
  { name: '客服 LINE', href: 'https://lin.ee/oqrp3av' },
  { name: '官方 LINE', href: 'https://lin.ee/WbLiLko' },
  { name: '官方 IG', href: 'https://www.instagram.com/5title.official/' },
];

// 定義連結名稱與圖示的對應關係
const linkIcons = {
  line: FaLine,
  instagram: FaInstagram,
  email: FaEnvelope,
  facebook: FaFacebook,
};

// 函式來根據連結名稱取得對應的圖示
const getLinkIcon = (name) => {
  const normalizedName = name.toLowerCase().replace(/^(客服|官方)\s*/, '').trim();
  return linkIcons[normalizedName] || null;
};

const Footer = ({ notes = defaultNotes, links = defaultLinks }) => {
  const cleanedNotes = Array.isArray(notes)
    ? notes.map(n => String(n ?? '').trim()).filter(Boolean)
    : [];
  const safeNotes = cleanedNotes.length ? cleanedNotes : defaultNotes;

  const cleanedLinks = Array.isArray(links)
    ? links
      .map(l => ({
        name: String(l?.name ?? '').trim(),
        href: String(l?.href ?? '').trim(),
      }))
      .filter(l => l.name && l.href)
    : [];
  const safeLinks = cleanedLinks.length ? cleanedLinks : defaultLinks;

  return (
    <footer className="bg-gray-800 text-gray-300">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4">【注意事項】</h3>
            <ul className="space-y-2 text-sm">
              {safeNotes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">相關連結</h3>
            <ul className="space-y-2 text-sm">
              {safeLinks.map((link, i) => {
                const IconComponent = getLinkIcon(link.name);
                return (
                  <li key={`${link.name}-${i}`} className="flex items-center">
                    {IconComponent && <IconComponent className="text-xl mr-2" />}
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors duration-200"
                    >
                      {link.name}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-700 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Steve day dream & Pig handmade All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;