BASE_URL = Meteor.absoluteUrl();

// TODO: make it dynamic so we dont have to rebuild a server to add a new one
CRYPTOS = ["BTC", "ETH", "LTC", "XRP", "NANO", "BCH"];
ERC20_TOKENS = ["AGI"];
CRYPTOS = CRYPTOS.concat(ERC20_TOKENS);

CURRENCIES = ["AUD", "USD", "EUR"];

TYPES = {
    1: "Crypto to Fiat",
    2: "Crypto to Crypto",
    3: "Fiat to Crypto",
    4: "Fiat to Fiat"
};

KYC_LEVELS = {
	0: "Anonymous",
	1: "Verified",
	2: "Verified+" // verified card
}

// Minimum KYC requirement level by TYPE ID
TYPE_VERIFICATION_LEVEL_REQUIRED = {
	1: 1, // 1 - Simple ID verification
	2: 1, // 0 - No verification required for c/c
	3: 1, // 2 - More complex verification required to prevent fraud
	4: 2
}

PAYMENT_TYPES = {
  AU: [
		{type: "PAYID", name: "PayID"},
    {type: "BANK", name: "Bank Account"},
		{type: "BPAY", name: "BPAY bill"}
  ],
  US: [
    {type: "BANK", name: "Bank Account"}
  ],
  LT: [
    {type: "BANK", name: "Bank Account"}
  ],
  DE: [
    {type: "BANK", name: "Bank Account"}
  ]
};

DOC_TYPES = {
	"passport": "Passport",
	"drivers-license": "Driver's Licence",
	"id-card": "ID Card",
	"other": "Other"
};

STATUSES = {
  0:	"Expired",
  1:	"Pending",
  2:	"Detected",
  3:	"Confirmed"
};

MAX_CHARS = 20;
BSB_CHARS = 6;
CURRENCY_CHARS = 3;
COUNTRY_CHARS = 2;
CONVERSION_EXPIRE_SECONDS = 6*60*60; // 6 hours

PROVIDERS = {
	"BTC":"https://blockchain.info/address/",
	"ETH":"https://etherscan.io/address/",
	// TODO: use etherscan for tokens automatically
	"AGI":"https://etherscan.io/address/",
	"LTC":"https://live.blockcypher.com/ltc/address/",
	"XRP":"https://xrpcharts.ripple.com/#/graph/",
	"NANO":"https://www.nanode.co/account/",
	"BCH":"https://blockdozer.com/address/"
};

BT_PUBLIC_KEY = "ss485tghyg58qykd";

//https://en.wikipedia.org/wiki/Bank_State_Branch
BSB_NUMBERS  = {
	"01"	: "ANZ",
	"03"	: "Westpac",
	"73"	: "Westpac",
	"06" 	: "Commonwealth Bank",
	"76"	: "Commonwealth Bank",
	"08"	: "NAB",
	"78"	: "NAB",
	"09"	: "Reserve Bank of Australia",
	"10"	: "BankSA",
	"11"	: "St George Bank",
	"33"	:	"St George Bank",
	"12"	: "Bank of Queensland",
	"639"	:	"Bank of Queensland",
	"14"	: "Rabobank",
	"15"	:	"Town & Country Bank",
	"18"	:	"Macquarie Bank",
	"19"	:	"Bank of Melbourne",
	"21"	:	"JPMorgan Chase Bank",
	"22"	:	"BNP Paribas",
	"23"	:	"Bank of America",
	"24"	:	"Citibank",
	"25"	:	"BNP Paribas",
	"26"	:	"BT Financial Group",
	"28"	:	"National Mutual Royal Bank",
	"29"	:	"Bank of Tokyo",
	"30"	:	"BankWest",
	"31"	: "Bank Australia",
	"34"	:	"HSBC Bank Australia",
	"985"	:	"HSBC Bank Australia",
	"35"	:	"Bank of China",
	"980"	:	"Bank of China",
	"40"	:	"Commonwealth Bank Group",
	"41"	:	"Deutsche Bank Australia",
	"42"	:	"Colonial Trust Bank",
	"52"	:	"Colonial Trust Bank",
	"45"	:	"OCBC Bank",
	"46"	:	"Advance Bank",
	"47"	:	"Challenge Bank",
	"48"	:	"Suncorp Bank",
	"664"	:	"Suncorp Bank",
	"533" 	: "Bannanacoast Community Credit Union",
	"610"	:	"Adelaide Bank",
	"630"	:	"ABS Building Society",
	"632"	:	"B&E",
	"633"	:	"Bendigo Bank",
	"637"	: "Greater bank",
	"638"	:	"Heritage Bank",
	"639"	:	"Home Building Society",
	"640"	: "Hume Bank",
	"642"	:	"Australian Millitary Bank",
	"645"	: "Auswide Bank",
	"656"	: "Auswide Bank",
	"650"	:	"Newcastle Permanent Building Society",
	"654"	: "ECU Australia",
	"657"	:	"Greater Bank",
	"70"	:	"Indue Limited",
	"704"	: "Victoria Teachers Mutual Bank",
	"728"	:	"Summerland Credit Union",
	"80"	:	"Cuscal Limited",
	"803"	:	"Defence Bank",
	"205"	:	"Defence Bank",
	"812"	:	"Teachers Mutual Bank Limited",
	"813"	:	"The Capricornian Ltd",
	"814"	:	"Credit Union Australia Ltd",
	"815"	:	"Police Dept Employees",
	"817"	:	"Warwick Credit Union",
	"819"	:	"Industrial & Commercial Bank of Australia",
	"931"	:	"Industrial & Commercial Bank of Australia",
	"888"	:	"China Construction Bank Corporation",
	"902"	:	"Australia Post",
	"911"	:	"Sumitomo Mitsui Banking Corporation",
	"913"	:	"State Street Bank & Trust Company",
	"915"	:	"FNC Agency - Bank One",
	"917"	:	"Arab Bank Australia",
	"918"	:	"Mizuho Corporate Bank",
	"922"	:	"United Overseas Bank",
	"923"	:	"ING Bank",
	"936"	:	"ING Bank",
	"932"	:	"New England Credit Union Ltd",
	"939"	:	"AMP Bank",
	"941"	:	"Delphi Bank",
	"942"	:	"Bank of Sydney",
	"943"	:	"Taiwan Business Bank",
	"944"	:	"ME Bank",
	"946"	:	"UBS AG",
	"951"	:	"Investec Bank",
	"952"	:	"Royal Bank of Scotland",
	"969"	:	"Tyro Payments"
};

COUNTRY_CODES = [
	{name: 'Afghanistan', code: 'AF'},
	{name: 'Åland Islands', code: 'AX'},
	{name: 'Albania', code: 'AL'},
	{name: 'Algeria', code: 'DZ'},
	{name: 'American Samoa', code: 'AS'},
	{name: 'AndorrA', code: 'AD'},
	{name: 'Angola', code: 'AO'},
	{name: 'Anguilla', code: 'AI'},
	{name: 'Antarctica', code: 'AQ'},
	{name: 'Antigua and Barbuda', code: 'AG'},
	{name: 'Argentina', code: 'AR'},
	{name: 'Armenia', code: 'AM'},
	{name: 'Aruba', code: 'AW'},
	{name: 'Australia', code: 'AU'},
	{name: 'Austria', code: 'AT'},
	{name: 'Azerbaijan', code: 'AZ'},
	{name: 'Bahamas', code: 'BS'},
	{name: 'Bahrain', code: 'BH'},
	{name: 'Bangladesh', code: 'BD'},
	{name: 'Barbados', code: 'BB'},
	{name: 'Belarus', code: 'BY'},
	{name: 'Belgium', code: 'BE'},
	{name: 'Belize', code: 'BZ'},
	{name: 'Benin', code: 'BJ'},
	{name: 'Bermuda', code: 'BM'},
	{name: 'Bhutan', code: 'BT'},
	{name: 'Bolivia', code: 'BO'},
	{name: 'Bosnia and Herzegovina', code: 'BA'},
	{name: 'Botswana', code: 'BW'},
	{name: 'Bouvet Island', code: 'BV'},
	{name: 'Brazil', code: 'BR'},
	{name: 'British Indian Ocean Territory', code: 'IO'},
	{name: 'Brunei Darussalam', code: 'BN'},
	{name: 'Bulgaria', code: 'BG'},
	{name: 'Burkina Faso', code: 'BF'},
	{name: 'Burundi', code: 'BI'},
	{name: 'Cambodia', code: 'KH'},
	{name: 'Cameroon', code: 'CM'},
	{name: 'Canada', code: 'CA'},
	{name: 'Cape Verde', code: 'CV'},
	{name: 'Cayman Islands', code: 'KY'},
	{name: 'Central African Republic', code: 'CF'},
	{name: 'Chad', code: 'TD'},
	{name: 'Chile', code: 'CL'},
	{name: 'China', code: 'CN'},
	{name: 'Christmas Island', code: 'CX'},
	{name: 'Cocos (Keeling) Islands', code: 'CC'},
	{name: 'Colombia', code: 'CO'},
	{name: 'Comoros', code: 'KM'},
	{name: 'Congo', code: 'CG'},
	{name: 'Congo, The Democratic Republic of the', code: 'CD'},
	{name: 'Cook Islands', code: 'CK'},
	{name: 'Costa Rica', code: 'CR'},
	{name: 'Cote D\'Ivoire', code: 'CI'},
	{name: 'Croatia', code: 'HR'},
	{name: 'Cuba', code: 'CU'},
	{name: 'Cyprus', code: 'CY'},
	{name: 'Czech Republic', code: 'CZ'},
	{name: 'Denmark', code: 'DK'},
	{name: 'Djibouti', code: 'DJ'},
	{name: 'Dominica', code: 'DM'},
	{name: 'Dominican Republic', code: 'DO'},
	{name: 'Ecuador', code: 'EC'},
	{name: 'Egypt', code: 'EG'},
	{name: 'El Salvador', code: 'SV'},
	{name: 'Equatorial Guinea', code: 'GQ'},
	{name: 'Eritrea', code: 'ER'},
	{name: 'Estonia', code: 'EE'},
	{name: 'Ethiopia', code: 'ET'},
	{name: 'Falkland Islands (Malvinas)', code: 'FK'},
	{name: 'Faroe Islands', code: 'FO'},
	{name: 'Fiji', code: 'FJ'},
	{name: 'Finland', code: 'FI'},
	{name: 'France', code: 'FR'},
	{name: 'French Guiana', code: 'GF'},
	{name: 'French Polynesia', code: 'PF'},
	{name: 'French Southern Territories', code: 'TF'},
	{name: 'Gabon', code: 'GA'},
	{name: 'Gambia', code: 'GM'},
	{name: 'Georgia', code: 'GE'},
	{name: 'Germany', code: 'DE'},
	{name: 'Ghana', code: 'GH'},
	{name: 'Gibraltar', code: 'GI'},
	{name: 'Greece', code: 'GR'},
	{name: 'Greenland', code: 'GL'},
	{name: 'Grenada', code: 'GD'},
	{name: 'Guadeloupe', code: 'GP'},
	{name: 'Guam', code: 'GU'},
	{name: 'Guatemala', code: 'GT'},
	{name: 'Guernsey', code: 'GG'},
	{name: 'Guinea', code: 'GN'},
	{name: 'Guinea-Bissau', code: 'GW'},
	{name: 'Guyana', code: 'GY'},
	{name: 'Haiti', code: 'HT'},
	{name: 'Heard Island and Mcdonald Islands', code: 'HM'},
	{name: 'Holy See (Vatican City State)', code: 'VA'},
	{name: 'Honduras', code: 'HN'},
	{name: 'Hong Kong', code: 'HK'},
	{name: 'Hungary', code: 'HU'},
	{name: 'Iceland', code: 'IS'},
	{name: 'India', code: 'IN'},
	{name: 'Indonesia', code: 'ID'},
	{name: 'Iran, Islamic Republic Of', code: 'IR'},
	{name: 'Iraq', code: 'IQ'},
	{name: 'Ireland', code: 'IE'},
	{name: 'Isle of Man', code: 'IM'},
	{name: 'Israel', code: 'IL'},
	{name: 'Italy', code: 'IT'},
	{name: 'Jamaica', code: 'JM'},
	{name: 'Japan', code: 'JP'},
	{name: 'Jersey', code: 'JE'},
	{name: 'Jordan', code: 'JO'},
	{name: 'Kazakhstan', code: 'KZ'},
	{name: 'Kenya', code: 'KE'},
	{name: 'Kiribati', code: 'KI'},
	{name: 'Korea, Democratic People\'S Republic of', code: 'KP'},
	{name: 'Korea, Republic of', code: 'KR'},
	{name: 'Kuwait', code: 'KW'},
	{name: 'Kyrgyzstan', code: 'KG'},
	{name: 'Lao People\'S Democratic Republic', code: 'LA'},
	{name: 'Latvia', code: 'LV'},
	{name: 'Lebanon', code: 'LB'},
	{name: 'Lesotho', code: 'LS'},
	{name: 'Liberia', code: 'LR'},
	{name: 'Libyan Arab Jamahiriya', code: 'LY'},
	{name: 'Liechtenstein', code: 'LI'},
	{name: 'Lithuania', code: 'LT'},
	{name: 'Luxembourg', code: 'LU'},
	{name: 'Macao', code: 'MO'},
	{name: 'Macedonia, The Former Yugoslav Republic of', code: 'MK'},
	{name: 'Madagascar', code: 'MG'},
	{name: 'Malawi', code: 'MW'},
	{name: 'Malaysia', code: 'MY'},
	{name: 'Maldives', code: 'MV'},
	{name: 'Mali', code: 'ML'},
	{name: 'Malta', code: 'MT'},
	{name: 'Marshall Islands', code: 'MH'},
	{name: 'Martinique', code: 'MQ'},
	{name: 'Mauritania', code: 'MR'},
	{name: 'Mauritius', code: 'MU'},
	{name: 'Mayotte', code: 'YT'},
	{name: 'Mexico', code: 'MX'},
	{name: 'Micronesia, Federated States of', code: 'FM'},
	{name: 'Moldova, Republic of', code: 'MD'},
	{name: 'Monaco', code: 'MC'},
	{name: 'Mongolia', code: 'MN'},
	{name: 'Montserrat', code: 'MS'},
	{name: 'Morocco', code: 'MA'},
	{name: 'Mozambique', code: 'MZ'},
	{name: 'Myanmar', code: 'MM'},
	{name: 'Namibia', code: 'NA'},
	{name: 'Nauru', code: 'NR'},
	{name: 'Nepal', code: 'NP'},
	{name: 'Netherlands', code: 'NL'},
	{name: 'Netherlands Antilles', code: 'AN'},
	{name: 'New Caledonia', code: 'NC'},
	{name: 'New Zealand', code: 'NZ'},
	{name: 'Nicaragua', code: 'NI'},
	{name: 'Niger', code: 'NE'},
	{name: 'Nigeria', code: 'NG'},
	{name: 'Niue', code: 'NU'},
	{name: 'Norfolk Island', code: 'NF'},
	{name: 'Northern Mariana Islands', code: 'MP'},
	{name: 'Norway', code: 'NO'},
	{name: 'Oman', code: 'OM'},
	{name: 'Pakistan', code: 'PK'},
	{name: 'Palau', code: 'PW'},
	{name: 'Palestinian Territory, Occupied', code: 'PS'},
	{name: 'Panama', code: 'PA'},
	{name: 'Papua New Guinea', code: 'PG'},
	{name: 'Paraguay', code: 'PY'},
	{name: 'Peru', code: 'PE'},
	{name: 'Philippines', code: 'PH'},
	{name: 'Pitcairn', code: 'PN'},
	{name: 'Poland', code: 'PL'},
	{name: 'Portugal', code: 'PT'},
	{name: 'Puerto Rico', code: 'PR'},
	{name: 'Qatar', code: 'QA'},
	{name: 'Reunion', code: 'RE'},
	{name: 'Romania', code: 'RO'},
	{name: 'Russian Federation', code: 'RU'},
	{name: 'RWANDA', code: 'RW'},
	{name: 'Saint Helena', code: 'SH'},
	{name: 'Saint Kitts and Nevis', code: 'KN'},
	{name: 'Saint Lucia', code: 'LC'},
	{name: 'Saint Pierre and Miquelon', code: 'PM'},
	{name: 'Saint Vincent and the Grenadines', code: 'VC'},
	{name: 'Samoa', code: 'WS'},
	{name: 'San Marino', code: 'SM'},
	{name: 'Sao Tome and Principe', code: 'ST'},
	{name: 'Saudi Arabia', code: 'SA'},
	{name: 'Senegal', code: 'SN'},
	{name: 'Serbia and Montenegro', code: 'CS'},
	{name: 'Seychelles', code: 'SC'},
	{name: 'Sierra Leone', code: 'SL'},
	{name: 'Singapore', code: 'SG'},
	{name: 'Slovakia', code: 'SK'},
	{name: 'Slovenia', code: 'SI'},
	{name: 'Solomon Islands', code: 'SB'},
	{name: 'Somalia', code: 'SO'},
	{name: 'South Africa', code: 'ZA'},
	{name: 'South Georgia and the South Sandwich Islands', code: 'GS'},
	{name: 'Spain', code: 'ES'},
	{name: 'Sri Lanka', code: 'LK'},
	{name: 'Sudan', code: 'SD'},
	{name: 'Suriname', code: 'SR'},
	{name: 'Svalbard and Jan Mayen', code: 'SJ'},
	{name: 'Swaziland', code: 'SZ'},
	{name: 'Sweden', code: 'SE'},
	{name: 'Switzerland', code: 'CH'},
	{name: 'Syrian Arab Republic', code: 'SY'},
	{name: 'Taiwan, Province of China', code: 'TW'},
	{name: 'Tajikistan', code: 'TJ'},
	{name: 'Tanzania, United Republic of', code: 'TZ'},
	{name: 'Thailand', code: 'TH'},
	{name: 'Timor-Leste', code: 'TL'},
	{name: 'Togo', code: 'TG'},
	{name: 'Tokelau', code: 'TK'},
	{name: 'Tonga', code: 'TO'},
	{name: 'Trinidad and Tobago', code: 'TT'},
	{name: 'Tunisia', code: 'TN'},
	{name: 'Turkey', code: 'TR'},
	{name: 'Turkmenistan', code: 'TM'},
	{name: 'Turks and Caicos Islands', code: 'TC'},
	{name: 'Tuvalu', code: 'TV'},
	{name: 'Uganda', code: 'UG'},
	{name: 'Ukraine', code: 'UA'},
	{name: 'United Arab Emirates', code: 'AE'},
	{name: 'United Kingdom', code: 'GB'},
	{name: 'United States', code: 'US'},
	{name: 'United States Minor Outlying Islands', code: 'UM'},
	{name: 'Uruguay', code: 'UY'},
	{name: 'Uzbekistan', code: 'UZ'},
	{name: 'Vanuatu', code: 'VU'},
	{name: 'Venezuela', code: 'VE'},
	{name: 'Viet Nam', code: 'VN'},
	{name: 'Virgin Islands, British', code: 'VG'},
	{name: 'Virgin Islands, U.S.', code: 'VI'},
	{name: 'Wallis and Futuna', code: 'WF'},
	{name: 'Western Sahara', code: 'EH'},
	{name: 'Yemen', code: 'YE'},
	{name: 'Zambia', code: 'ZM'},
	{name: 'Zimbabwe', code: 'ZW'}
  ]