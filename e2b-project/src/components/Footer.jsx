
import React from 'react';

const Footer = () => {
  const notes = [
    "2025年預購商品出貨時間：",
    "◎公仔＆御守，預計8~10月開始陸續出貨。",
    "◎服飾＆帽子，預計10月開始陸續出貨。",
    "◎滑鼠墊＆杯墊，預計9月開始陸續出貨。",
    "單筆訂單購買上限為NT\$20,000，如超過金額請分次下單。",
    "同筆訂單商品皆為到齊後一起出貨，如欲購買其他現貨、訂製商品，需提早出貨，請分開下單。",
    "選擇線上付款之訂單，付款完成後請務必再次檢查訂單狀態是否付款成功。如未付款完成視同【訂單未成立】，系統將自動取消訂單，如有疑問速洽Fandora客服LINE。",
    "海外地區寄送運費，針對不同地區與訂單金額酌收不同費用，實際運費以結帳金額顯示為主，煩請留意。",
    "訂購後無法更改訂單內容，如有更換尺寸或款式問題，需取消訂單重新下訂，恕不提供訂單修改服務。",
    "海外觀眾購買，除了【中港澳】以外，其他地區收件資訊僅接收【英文】資訊，請務必填寫正確英文收件人名（建議使用護照英文名）與英文收件地址，以利配送順利。",
    "海外觀眾購買，電話請在最前面加上 \"+電話區碼\"， 例如中國+86、新加坡+65，以此類推，如有問題速洽Fandora官方LINE。",
    "收到包裹準備開箱時務必全程錄影(需一鏡到底不得後製或剪輯影片)，因運送途中可能遇到海關抽查，或是包裹壓損等糾紛，請您務必配合錄影，以便追究所屬責任，如無錄影開箱後發生商品損傷或缺件，將無法提供售後服務，敬請見諒。",
    "依顺丰公告之【出口至中国大陆个人件注意事项】，个人件单笔金额(含运费)需在 NT\$8,000 以内，超过请分开结账。若未分开，客服将通知取消订单+请您分开重新下单，造成您的不便敬请见諒。",
    "【 防詐騙提醒】Fandora不會主動打電話詢問訂單相關資訊，請特別小心留意！"
  ];

  const links = [
    { name: "Fandora客服LINE", href: "https://lin.ee/oqrp3av" },
    { name: "五歲抬頭官方LINE", href: "https://lin.ee/WbLiLko" },
    { name: "五歲抬頭官方LINE@", href: "https://lin.ee/RnKCTAM" },
    { name: "五歲抬頭官方IG", href: "https://www.instagram.com/5title.official/" }
  ];

  return (
    <footer className="bg-gray-800 text-gray-300">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4">【注意事項】</h3>
            <ul className="space-y-2 text-sm">
              {notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">相關連結</h3>
            <ul className="space-y-2 text-sm">
              {links.map((link) => (
                <li key={link.name}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-700 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} 老高與小茉 Mr & Mrs Gao Fandora Shop Clone. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
