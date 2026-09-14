import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Microphone, Camera, VideoCamera, Storefront, House, Bag, ChatCircleDots, User, Globe, Bell, Package, ChartBar, ArrowLeft, ArrowRight, CaretRight, Check, Plus, PencilSimple, Stop, UploadSimple, Sun, Crosshair, Image as ImageIcon, SignOut, Question, X, CheckCircle, Eye, Sparkle, QrCode, ChatText, Info, Phone, LockKey } from '@phosphor-icons/react';
import { MobileScroll, KeyboardInput, KeyboardTextarea, useKeyboard, useKeyboardInsets, BottomSheet } from './mobile';
import '@fontsource/nunito-sans/400.css';
import '@fontsource/nunito-sans/600.css';
import '@fontsource/nunito-sans/700.css';
import '@fontsource/nunito-sans/800.css';
import './prototype.css';
import { LegacyWelcome, LegacyAuth } from './AuthPages';

type Product = {name:string;category:string;material:string;size:string;craft:string;description:string;minimum:string;price:string;quantity:string;delivery:string;photo:string;status:string};
const sample:Product={name:'Handwoven Storage Basket',category:'Home & Living',material:'Natural fibre',size:'30 × 25 cm',craft:'Handwoven',description:'A versatile woven basket with two easy-carry handles for everyday storage.',minimum:'800',price:'950',quantity:'12',delivery:'7 days',photo:'/assets/basket.png',status:'Draft'};
const blank:Product={name:'',category:'',material:'',size:'',craft:'',description:'',minimum:'',price:'',quantity:'',delivery:'',photo:'',status:'Draft'};

// Demo marketplace links used by the existing Marketplace screen.
// The new Link to Marketplace screen below intentionally shows these as Unsupported
// until backend/API permissions are available.
const marketplaces=[
  {name:'Amazon',url:'https://www.amazon.in',listed:true},
  {name:'Flipkart',url:'https://www.flipkart.com',listed:true},
  {name:'Meesho',url:'https://www.meesho.com',listed:true},
  {name:'Etsy',url:'https://www.etsy.com/in-en',listed:false},
  {name:'IndiaMART',url:'https://www.indiamart.com',listed:false}
];
const navItems=[['Home',House],['Products',Bag],['Marketplace',Storefront],['Profile',User]] as const;
function Field({label,value,onChange,type='text',placeholder=''}:{label:string;value:string;onChange:(v:string)=>void;type?:string;placeholder?:string}) {return <label className="field">{label}<KeyboardInput type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>}
function Button({children,onClick,secondary=false,disabled=false}:{children:ReactNode;onClick:()=>void;secondary?:boolean;disabled?:boolean}) {return <button className={secondary?'button secondary':'button primary'} disabled={disabled} onClick={onClick}>{children}</button>}
function Brand(){return <div className="brand"><img src="/assets/diya.png" alt="Karigar Kart diya"/><div><strong>KARIGAR <span>KART</span></strong><small>HANDMADE. TRUSTED. DELIVERED.</small></div></div>}
function ProductCamera({onCapture,hindi}:{onCapture:(photo:string)=>void;hindi:boolean}) {
 const video=useRef<HTMLVideoElement>(null);
 const [ready,setReady]=useState(false);
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
   let cancelled=false;
   let stream:MediaStream|undefined;
   setReady(false);setError('');
   const open=async()=>{
     try {
       if(!window.isSecureContext) throw new Error('INSECURE');
       if(!navigator.mediaDevices?.getUserMedia) throw new Error('UNSUPPORTED');
       const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
       if(cancelled){acquired.getTracks().forEach(track=>track.stop());return;}
       stream=acquired;
       if(video.current){video.current.srcObject=stream;await video.current.play();}
     } catch(err) {
       stream?.getTracks().forEach(track=>track.stop());
       if(cancelled)return;
       const name=err instanceof Error?err.name:'';
       const reason=err instanceof Error?err.message:'';
       setError(reason==='INSECURE'
         ? (hindi?'कैमरे के लिए ऐप HTTPS या localhost पर खोलें।':'Open the app over HTTPS or localhost to use the camera.')
         : reason==='UNSUPPORTED'
         ? (hindi?'यह ब्राउज़र कैमरा सपोर्ट नहीं करता। Chrome या Safari में खोलें।':'This browser does not support camera access. Open in Chrome or Safari.')
         : name==='NotAllowedError'||name==='SecurityError'
         ? (hindi?'ब्राउज़र की साइट सेटिंग में कैमरा अनुमति दें, फिर दोबारा कोशिश करें।':'Allow camera access in your browser site settings, then try again.')
         : name==='NotFoundError'
         ? (hindi?'कैमरा नहीं मिला। कैमरा कनेक्ट करके दोबारा कोशिश करें।':'No camera found. Connect a camera and try again.')
         : (hindi?'कैमरा शुरू नहीं हुआ। अन्य कैमरा ऐप बंद करके दोबारा कोशिश करें।':'Could not start the camera. Close other camera apps and try again.'));
     }
   };
   void open();
   return()=>{cancelled=true;stream?.getTracks().forEach(track=>track.stop());};
 },[attempt,hindi]);
 const capture=()=>{
   const source=video.current;
   if(!source||!source.videoWidth||!source.videoHeight)return;
   const canvas=document.createElement('canvas');
   canvas.width=source.videoWidth;canvas.height=source.videoHeight;
   const context=canvas.getContext('2d');
   if(!context){setError(hindi?'फोटो नहीं ली जा सकी। दोबारा कोशिश करें।':'Could not capture the photo. Try again.');return;}
   context.drawImage(source,0,0);
   onCapture(canvas.toDataURL('image/jpeg',0.92));
 };
 return <div className="product-camera">
   {error?<><p role="alert">{error}</p><Button secondary onClick={()=>setAttempt(n=>n+1)}>{hindi?'दोबारा कोशिश करें':'Try Again'}</Button></>:<>
     <video ref={video} autoPlay playsInline muted aria-label={hindi?'कैमरा प्रीव्यू':'Camera preview'} onCanPlay={()=>setReady(true)}/>
     <p role="status">{ready?(hindi?'उत्पाद को फ्रेम में रखें और फोटो लें।':'Keep your product in the frame and take a photo.'):(hindi?'कैमरा खुल रहा है… अनुमति मांगे जाने पर अनुमति दें।':'Opening camera… Allow camera access when prompted.')}</p>
     <Button disabled={!ready} onClick={capture}><Camera/>{hindi?'फोटो खींचें':'Capture Photo'}</Button>
   </>}
 </div>;
}

export default function Prototype(){
 const [page,setPage]=useState('Home'); const [history,setHistory]=useState<string[]>([]); const [sheet,setSheet]=useState(''); const [notice,setNotice]=useState('');
 const [product,setProduct]=useState<Product>({...sample}); const [products,setProducts]=useState<Product[]>([{...sample,status:'Live'},{...sample,name:'Woven Basket — Small',price:'650',status:'Out of Stock',quantity:'0'},{...sample}]);
 const [editingIndex,setEditingIndex]=useState<number|null>(null); const [filter,setFilter]=useState('All'); const [recording,setRecording]=useState(false); const [seconds,setSeconds]=useState(0); const [typed,setTyped]=useState(false); const [voiceText,setVoiceText]=useState(''); const [busy,setBusy]=useState(false); const [hindiTranslation,setHindiTranslation]=useState(''); const [englishTranslation,setEnglishTranslation]=useState(''); const [enhanced,setEnhanced]=useState(false); const [selectedPhoto,setSelectedPhoto]=useState<'original'|'enhanced1'|'enhanced2'>('original');
 const [responded,setResponded]=useState(false); const [requestStatus,setRequestStatus]=useState('New Request'); const [reply,setReply]=useState({quantity:'20',price:'900',timeline:'10 days',custom:'Yes',charges:'0',message:''});
 const [profile,setProfile]=useState({name:'Sunita',business:'Sunita Handcrafts',location:'Bhubaneswar, Odisha',craft:'Basket weaving',contact:'sunita@example.com',phone:'+91 98765 43210'}); const [editProfile,setEditProfile]=useState(false); const [language,setLanguage]=useState<'English'|'Hindi'>('English'); const [feedback,setFeedback]=useState(''); const [craftSearch,setCraftSearch]=useState(''); const [craftFilter,setCraftFilter]=useState('All'); const [profileScrolled,setProfileScrolled]=useState(false);
 const [auth,setAuth]=useState({name:'',mobile:'',otp:'',terms:false}); const [authOtpSent,setAuthOtpSent]=useState(false); const [error,setError]=useState(''); const file=useRef<HTMLInputElement>(null);const keyboard=useKeyboard(); const {bottomInset}=useKeyboardInsets();
 const go=(p:string)=>{keyboard.hide();setError('');setRecording(false);setHistory(h=>[...h,page]);setPage(p)}; const back=()=>{keyboard.hide();setPage(history.at(-1)||'Home');setHistory(h=>h.slice(0,-1));setError('')};
 const tab=(p:string)=>{keyboard.hide();setHistory([]);setPage(p);setError('')}; const update=(k:keyof Product,v:string)=>setProduct(p=>({...p,[k]:v}));
 const tell=(message:string)=>{keyboard.hide();setNotice(message);setTimeout(()=>setNotice(''),3500)};
 useEffect(()=>{if(!recording)return;const t=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(t)},[recording]);
 useEffect(()=>{
   if(page!=='Profile'){setProfileScrolled(false);return;}
   const scroll=document.querySelector('.kk-scroll');
   if(!scroll)return;
   const onScroll=()=>setProfileScrolled((scroll as HTMLElement).scrollTop>90);
   onScroll(); scroll.addEventListener('scroll',onScroll,{passive:true});
   return()=>scroll.removeEventListener('scroll',onScroll);
 },[page]);
 useEffect(()=>{
   const root=document.querySelector('.kk-app');
   if(!root)return;
   const translations:Record<string,string>={
     'Home':'होम','Products':'उत्पाद','Marketplace':'मार्केटप्लेस','Link to Marketplace':'मार्केटप्लेस से लिंक करें','Enquiries':'पूछताछ','Profile':'प्रोफाइल','Hello,':'नमस्ते,','Keep creating. Handmade changes lives.':'बनाते रहें। हस्तनिर्मित कला जीवन बदलती है।','SPEAK FIRST':'पहले बोलें','Create New Product Listing':'नया उत्पाद लिस्टिंग बनाएं','Turn your craft into opportunity.':'अपनी कला को अवसर में बदलें।','Upload Product Photo':'उत्पाद की फोटो अपलोड करें','Speak about your product. Add a photo.':'अपने उत्पाद के बारे में बोलें। एक फोटो जोड़ें।','Take a photo or upload one from your device.':'अपने डिवाइस से फोटो लें या अपलोड करें।','My Products':'मेरे उत्पाद','Buyer Enquiries':'खरीदार की पूछताछ','Orders / Requests':'ऑर्डर / अनुरोध','Insights':'जानकारी','Demo Videos':'डेमो वीडियो','Continue where you left off':'जहाँ छोड़ा था वहीं से शुरू करें','DRAFT':'ड्राफ्ट','Finish your listing and share your craft with the world.':'अपनी लिस्टिंग पूरी करें और अपनी कला दुनिया तक पहुँचाएँ।',
     'Tell us about your product':'अपने उत्पाद के बारे में बताएं','Its name, size and what makes it special.':'इसका नाम, आकार और इसे खास बनाने वाली बात बताएं।','Tap to Speak':'बोलने के लिए टैप करें','Stop':'रोकें','Recording demo':'रिकॉर्डिंग डेमो','Voice interaction preview':'वॉइस इंटरैक्शन प्रीव्यू','Hindi Translation':'हिंदी अनुवाद','English Translation':'अंग्रेज़ी अनुवाद','Type Instead':'इसके बजाय टाइप करें','Product description':'उत्पाद का विवरण','Describe your product in your own words':'अपने शब्दों में उत्पाद का वर्णन करें','Use Description':'विवरण इस्तेमाल करें','Try the voice flow with a sample basket description.':'सैंपल बास्केट विवरण के साथ वॉइस फ्लो आज़माएँ।','Use Sample Description':'सैंपल विवरण इस्तेमाल करें',
     'Does this look right?':'क्या यह सही दिख रहा है?','Check the details before continuing. Only keep information you can confirm.':'आगे बढ़ने से पहले विवरण जाँचें। केवल वही जानकारी रखें जिसकी आप पुष्टि कर सकते हैं।','Product Name':'उत्पाद का नाम','Category':'श्रेणी','Material':'सामग्री','Size':'आकार','Craft / Technique':'कला / तकनीक','Not specified':'उल्लेखित नहीं','Short Description':'संक्षिप्त विवरण','Confirm Details':'विवरण की पुष्टि करें','Save as Draft':'ड्राफ्ट के रूप में सेव करें','What material is it made from?':'यह किस सामग्री से बना है?','Choose one, type your answer, or leave it unspecified.':'एक चुनें, अपना उत्तर टाइप करें या खाली छोड़ दें।','Natural fibre':'प्राकृतिक फाइबर','Cotton':'कपास','Clay':'मिट्टी','Answer by Voice':'वॉइस से उत्तर दें','Continue':'जारी रखें','Leave Unspecified':'उल्लेखित नहीं रखना',
     'Let your product shine':'अपने उत्पाद को चमकने दें','Add a clear photo of the actual product.':'वास्तविक उत्पाद की साफ फोटो जोड़ें।','Add product photos':'उत्पाद की फोटो जोड़ें','Take Photo':'फोटो लें','Upload Photo':'फोटो अपलोड करें','Good lighting':'अच्छी रोशनी','Keep centered':'बीच में रखें','Clean background':'साफ बैकग्राउंड','Use Sample Photo':'सैंपल फोटो इस्तेमाल करें',"Your product's colour, shape and craft stay yours.":'आपके उत्पाद का रंग, आकार और कला आपकी ही रहेगी।','A clearer first impression':'पहला प्रभाव और बेहतर बनाएं','Keep the product true to life.':'उत्पाद को वास्तविक रूप में ही रखें।','Original':'मूल फोटो','Enhanced Image 1':'बेहतर फोटो 1','Enhanced Image 2':'बेहतर फोटो 2','Choose a photo to continue.':'आगे बढ़ने के लिए एक फोटो चुनें।','SUGGESTIONS':'सुझाव','Choose any one of the three photos.':'तीनों में से कोई भी एक फोटो चुनें।','For now, all three options use the original image. Your backend can replace Enhanced Image 1 and Enhanced Image 2 later.':'अभी तीनों विकल्प मूल फोटो का उपयोग करते हैं। बाद में आपका बैकएंड Enhanced Image 1 और Enhanced Image 2 की जगह वास्तविक बेहतर फोटो लगा सकता है।','Preparing your product photo…':'आपकी उत्पाद फोटो तैयार की जा रही है…','Enhance Photo':'फोटो बेहतर करें','Use This Photo':'यह फोटो इस्तेमाल करें','Choose Another Photo':'दूसरी फोटो चुनें',
     'Your listing, coming together':'आपकी लिस्टिंग तैयार हो रही है','Add a short description before publishing.':'पब्लिश करने से पहले छोटा विवरण जोड़ें।','Category unspecified':'श्रेणी उल्लेखित नहीं','Material unspecified':'सामग्री उल्लेखित नहीं','Size unspecified':'आकार उल्लेखित नहीं','Tags:':'टैग:','not specified':'उल्लेखित नहीं','Edit Details':'विवरण संपादित करें','Continue to Pricing':'प्राइसिंग पर जाएँ','You choose your price':'आप अपनी कीमत चुनें','What is the minimum price you are willing to accept?':'आप न्यूनतम कितनी कीमत स्वीकार करेंगे?','Minimum Price (₹)':'न्यूनतम कीमत (₹)','SUGGESTED PRICE RANGE':'सुझाई गई कीमत सीमा','Based on similar products and current market prices.':'समान उत्पादों और वर्तमान बाजार कीमतों पर आधारित।','Illustrative sample range':'उदाहरणात्मक सैंपल रेंज','Selected Selling Price (₹)':'चुनी गई बिक्री कीमत (₹)','Choose your price':'अपनी कीमत चुनें','The sample range is below your minimum. Choose a price that works for you.':'सैंपल रेंज आपकी न्यूनतम कीमत से कम है। अपनी उपयुक्त कीमत चुनें।','Selling price must meet your minimum.':'बिक्री कीमत आपकी न्यूनतम कीमत से कम नहीं होनी चाहिए।','The recommendation is a guide. The final price is always yours.':'यह सुझाव केवल मार्गदर्शन है। अंतिम कीमत हमेशा आपकी होगी।','Review Listing':'लिस्टिंग की समीक्षा करें',
     'Final Review':'अंतिम समीक्षा','Publish Listing':'लिस्टिंग पब्लिश करें','Published':'पब्लिश हो गया','Listing published successfully.':'लिस्टिंग सफलतापूर्वक पब्लिश हो गई।','All':'सभी','Live':'लाइव','Out of Stock':'स्टॉक खत्म','Draft':'ड्राफ्ट','No products found.':'कोई उत्पाद नहीं मिला।','View':'देखें','Edit':'संपादित करें','Delete':'हटाएँ',
     'Personal ID':'व्यक्तिगत आईडी','Your Personal QR Code':'आपका व्यक्तिगत QR कोड','Scan to open this artisan profile.':'इस कारीगर प्रोफाइल को खोलने के लिए स्कैन करें।','CRAFT':'कला','Craft Category':'कला श्रेणी','PROFILE':'प्रोफाइल','Your Profile':'आपकी प्रोफाइल','Edit Profile':'प्रोफाइल संपादित करें','Close':'बंद करें','Name':'नाम','Business':'व्यवसाय','Business / Artisan Name':'व्यवसाय / कारीगर का नाम','Location':'स्थान','Mobile':'मोबाइल','Mobile Number':'मोबाइल नंबर','Email':'ईमेल','Save Profile':'प्रोफाइल सेव करें','VOICE OF ARTISANS':'कारीगरों की आवाज','Suggestions & Feedback':'सुझाव और प्रतिक्रिया','Tell us what we can improve for artisans.':'बताएँ कि हम कारीगरों के लिए क्या बेहतर कर सकते हैं।','Write your suggestion or feedback...':'अपना सुझाव या प्रतिक्रिया लिखें...','Submit Feedback':'प्रतिक्रिया सबमिट करें','Language':'भाषा','Help & Support':'सहायता और सपोर्ट','About Karigar Kart':'करिगर कार्ट के बारे में','Account Settings':'अकाउंट सेटिंग्स','Logout':'लॉगआउट','Choose your language':'अपनी भाषा चुनें','English selected':'अंग्रेज़ी चुनी गई','One new buyer enquiry':'खरीदार की एक नई पूछताछ','View Enquiries':'पूछताछ देखें','Need help with listings, orders or your profile? Contact our demo support team.':'लिस्टिंग, ऑर्डर या प्रोफाइल में मदद चाहिए? हमारी डेमो सपोर्ट टीम से संपर्क करें।','Mobile 1':'मोबाइल 1','Mobile 2':'मोबाइल 2','Email 1':'ईमेल 1','Email 2':'ईमेल 2','About Karigar Kart is a digital platform':'करिगर कार्ट एक डिजिटल प्लेटफॉर्म है','Karigar Kart is a digital platform designed to help artisans present their handmade products, connect with buyers and grow their craft-based business.':'करिगर कार्ट एक डिजिटल प्लेटफॉर्म है जो कारीगरों को अपने हस्तनिर्मित उत्पाद दिखाने, खरीदारों से जुड़ने और अपने शिल्प-आधारित व्यवसाय को बढ़ाने में मदद करता है।','Our goal is to make it easier for artisans to tell their story, showcase their work, receive buyer enquiries and manage product listings from one place.':'हमारा लक्ष्य कारीगरों के लिए अपनी कहानी बताना, अपना काम दिखाना, खरीदारों की पूछताछ पाना और एक ही जगह से उत्पाद लिस्टिंग प्रबंधित करना आसान बनाना है।','Password Recovery':'पासवर्ड रिकवरी','Recovery preview complete. No email or SMS was sent.':'रिकवरी प्रीव्यू पूरा हुआ। कोई ईमेल या SMS नहीं भेजा गया।','Welcome Back':'वापसी पर स्वागत है','Create Account':'अकाउंट बनाएं','Login to continue to Karigar Kart':'करिगर कार्ट जारी रखने के लिए लॉगिन करें','Join the Karigar Kart community':'करिगर कार्ट कम्युनिटी से जुड़ें','Full Name':'पूरा नाम','Password':'पासवर्ड','Confirm Password':'पासवर्ड की पुष्टि करें','I agree to the':'मैं सहमत हूँ','Terms & Conditions':'नियम और शर्तें','Forgot Password?':'पासवर्ड भूल गए?','Complete all fields, match passwords and accept terms.':'सभी फ़ील्ड भरें, पासवर्ड मिलाएँ और नियम स्वीकार करें।','Login':'लॉगिन','Create account':'अकाउंट बनाएं','Already have an account? Login':'पहले से अकाउंट है? लॉगिन करें','Preview only. Use sample details.':'केवल प्रीव्यू। सैंपल विवरण इस्तेमाल करें।','Get Started':'शुरू करें','Your craft.':'आपकी कला।','A world of possibilities.':'संभावनाओं की दुनिया।','Empowering artisans, celebrating craftsmanship.':'कारीगरों को सशक्त बनाना, हस्तकला का उत्सव।','Already have an account?':'पहले से अकाउंट है?','Forgot your password?':'पासवर्ड भूल गए?','Enter your email or mobile number.':'अपना ईमेल या मोबाइल नंबर दर्ज करें।','Send Reset Instructions':'रीसेट निर्देश भेजें'
   };
   Object.assign(translations,{
     'Create Listing':'लिस्टिंग बनाएं','Create product':'उत्पाद बनाएं','Product Details':'उत्पाद विवरण','Ready to share your craft?':'अपनी कला साझा करने के लिए तैयार हैं?','Publish Product':'उत्पाद पब्लिश करें','Publishing updates this prototype':'पब्लिश करने से यह प्रोटोटाइप अपडेट होगा','Photo not added':'फोटो नहीं जोड़ी गई','Photo not added yet':'अभी फोटो नहीं जोड़ी गई','available':'उपलब्ध','Delivery:':'डिलीवरी:','Availability updated':'उपलब्धता अपडेट हो गई','Mark Available':'उपलब्ध के रूप में चिह्नित करें','Mark Out of Stock':'स्टॉक खत्म के रूप में चिह्नित करें','New':'नया','Replied':'उत्तर दिया गया','Not agreed':'सहमत नहीं','Price not agreed':'कीमत पर सहमति नहीं','Accepted':'स्वीकार किया गया','Completed':'पूरा हुआ','Request accepted in this demo.':'इस डेमो में अनुरोध स्वीकार किया गया।','Request marked completed.':'अनुरोध पूरा हुआ।','View Request':'अनुरोध देखें','Respond':'उत्तर दें','Edit Response':'उत्तर संपादित करें','Available Quantity':'उपलब्ध मात्रा','Bulk Price per Piece (₹)':'प्रति पीस थोक कीमत (₹)','Delivery Timeline':'डिलीवरी समय','Additional Charges (₹)':'अतिरिक्त शुल्क (₹)','Anything else the buyer should know?':'क्या खरीदार को और कुछ जानना चाहिए?','Discussion':'चर्चा','Response saved in the prototype.':'प्रोटोटाइप में उत्तर सेव हो गया।','Request Detail':'अनुरोध विवरण','Basket Weaving':'बास्केट बुनाई','Pottery':'मिट्टी के बर्तन','Embroidery':'कढ़ाई','Wood Carving':'लकड़ी की नक्काशी','Handloom & Textiles':'हैंडलूम और टेक्सटाइल','Painting & Folk Art':'पेंटिंग और लोक कला','Jewellery':'आभूषण','Metal Craft':'धातु शिल्प','Bamboo Craft':'बांस शिल्प','Leather Craft':'चमड़ा शिल्प','Cane Craft':'केन शिल्प','Terracotta':'टेराकोटा','Natural Fibre':'प्राकृतिक फाइबर','Textile':'टेक्सटाइल','Wood':'लकड़ी','Metal':'धातु','Art':'कला','Leather':'चमड़ा','Bamboo':'बांस','Handwoven Storage Basket':'हाथ से बुनी स्टोरेज बास्केट','Home & Living':'घर और जीवनशैली','Handwoven':'हाथ से बुना','A versatile woven basket with two easy-carry handles for everyday storage.':'रोज़मर्रा के स्टोरेज के लिए दो आसान हैंडल वाली बहुउपयोगी बुनी हुई बास्केट।','Woven Basket — Small':'बुनी हुई बास्केट — छोटी','Open profile':'प्रोफाइल खोलें','Notifications':'सूचनाएँ','Back':'वापस','Language':'भाषा','Step':'चरण','of 4':'में से 4','Please choose an image.':'कृपया एक फोटो चुनें।','Demo account opened. No credentials are sent or stored.':'डेमो अकाउंट खुल गया। कोई क्रेडेंशियल भेजे या सेव नहीं किए गए।','Selected language is saved for this session.':'चुनी गई भाषा इस सत्र के लिए सेव है।','The selected language is saved for this session.':'चुनी गई भाषा इस सत्र के लिए सेव है।','The Earth Store is interested in 20 baskets.':'The Earth Store 20 बास्केट में रुचि रखता है।','Karigar Kart is a digital platform designed to help artisans present their handmade products, connect with buyers and grow their craft-based business.':'करिगर कार्ट एक डिजिटल प्लेटफॉर्म है जो कारीगरों को अपने हस्तनिर्मित उत्पाद दिखाने, खरीदारों से जुड़ने और अपने शिल्प-आधारित व्यवसाय को बढ़ाने में मदद करता है।','Our goal is to make it easier for artisans to tell their story, showcase their work, receive buyer enquiries and manage product listings from one place.':'हमारा लक्ष्य कारीगरों के लिए अपनी कहानी बताना, काम दिखाना, खरीदारों की पूछताछ पाना और एक ही जगह से उत्पाद लिस्टिंग प्रबंधित करना आसान बनाना है।','This interactive demo uses sample data. Changes last until the page is refreshed.':'यह इंटरैक्टिव डेमो सैंपल डेटा का उपयोग करता है। बदलाव पेज रिफ्रेश होने तक रहेंगे।','Prototype terms preview only. A production service will provide its full terms and privacy policy before registration.':'केवल प्रोटोटाइप नियमों का प्रीव्यू। वास्तविक सेवा रजिस्ट्रेशन से पहले पूरी नियम और प्राइवेसी नीति देगी।','Karigar Kart':'करिगर कार्ट','Products':'उत्पाद','Enquiries':'पूछताछ','Requests':'अनुरोध','Profile':'प्रोफाइल','Insights':'जानकारी'
   });
   const reverse=Object.fromEntries(Object.entries(translations).map(([en,hi])=>[hi,en]));
   const translate=()=>{
     const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
     let n:Node|null;
     while(n=walker.nextNode()){
       const value=n.nodeValue?.trim(); if(!value)continue;
       const next=language==='Hindi'?(translations[value]||value):(reverse[value]||value);
       if(next!==value)n.nodeValue=n.nodeValue!.replace(value,next);
       else if(language==='Hindi'){
         const selected=value.match(/^(.+) selected$/); if(selected) n.nodeValue=value.replace(selected[1],translations[selected[1]]||selected[1]).replace(/ selected$/,' चुना गया');
         const recording=value.match(/^(\d+:\d+) · Recording demo$/); if(recording) n.nodeValue=`${recording[1]} · रिकॉर्डिंग डेमो`;
       }
     }
     root.querySelectorAll('input[placeholder],textarea[placeholder],[aria-label]').forEach(el=>{
       for(const attr of ['placeholder','aria-label']){const value=el.getAttribute(attr);if(!value)continue;const next=language==='Hindi'?(translations[value]||value):(reverse[value]||value);if(next!==value)el.setAttribute(attr,next);}
     });
   };
   translate();
   const observer=new MutationObserver(()=>translate()); observer.observe(root,{subtree:true,childList:true,characterData:true});
   return()=>observer.disconnect();
 },[language,page,notice]);
 const demoVoice=()=>{setRecording(false);setBusy(true);setTimeout(()=>{setProduct({...sample,material:'',craft:'',photo:product.photo||'/assets/basket.png',minimum:'',price:'',quantity:'',delivery:''});setBusy(false);go('Check Details')},900)};
 const start=()=>{setEditingIndex(null);setProduct({...blank});setVoiceText('');setHindiTranslation('');setEnglishTranslation('');setTyped(false);setEnhanced(false);setSelectedPhoto('original');setSeconds(0);go('Add Photos')};
 const save=(status:string)=>{const saved={...product,status};setProducts(ps=>editingIndex===null?[saved,...ps]:ps.map((p,i)=>i===editingIndex?saved:p));setEditingIndex(null);setProduct(saved);if(status==='Live')go('Published');else {tab('Products');tell('Draft saved. Continue whenever you are ready.')}};
 const workflow=['Add Photos','Photo Review','Tell Your Story','Check Details','Listing Preview','Smart Pricing','Pricing Preview','Final Review']; const stage=workflow.includes(page)? page==='Add Photos'||page==='Photo Review'?1:page==='Tell Your Story'?2:page==='Check Details'?3:4:0;
 const authPage=['Welcome','Login','Sign Up','Forgot Password'].includes(page); const navVisible=!authPage&&!stage&&page!=='Published';
 const draft=products.find(p=>p.status==='Draft');
 const detailFields=()=> <div className="details">{(['name','category','material','size','craft'] as const).map(k=><Field key={k} label={({name:'Product Name',category:'Category',material:'Material',size:'Size',craft:'Craft / Technique'})[k]} value={product[k]} onChange={v=>update(k,v)} placeholder="Not specified"/>)}</div>;
 const mini=(p:Product)=> <div className="product-summary"><img src={p.photo||'/assets/basket.png'} alt={p.name||'Product'}/><div><h3>{p.name||'Untitled product'}</h3><p>{p.category||'Category not specified'}</p>{p.price&&<strong>₹{p.price}</strong>}</div></div>;
 const content=()=>{switch(page){
 case 'Home':return <><div className="home-greeting"><h1>Hello, {profile.name}</h1><p>Keep creating. Handmade changes lives.</p></div><section className="voice-hero"><div className="eyebrow">ADD PRODUCT PHOTO</div><h2>Create New Product Listing</h2><div className="voice-actions"><button className="voice-circle" onClick={start}><Camera size={52} weight="light"/><span>Upload Photo</span></button></div><p className="hero-bottom">Take a photo or upload one from your device.</p></section><div className="shortcuts">{[['Buyer Enquiries',ChatCircleDots,'Enquiries'],['Orders / Requests',Package,'Requests'],['Insights',ChartBar,'Insights'],['Demo Videos',VideoCamera,'Demo Videos']].map(([label,Icon,p])=><button key={String(p)} onClick={()=>go(String(p))}>{typeof Icon!=='string'&&<Icon size={31} weight="light"/>}<span>{String(label)}</span></button>)}</div>{draft&&<section className="continue"><h2>Continue where you left off</h2><button className="draft-card" onClick={()=>{setEditingIndex(products.indexOf(draft));setProduct({...draft});go('Check Details')}}><img src={draft.photo} alt="Woven basket draft"/><div><small>DRAFT</small><h3>{draft.name}</h3><p>Finish your listing and share your craft with the world.</p></div><CaretRight size={20}/></button></section>}</>;
 case 'Tell Your Story':return <><h1>Tell us about your product</h1><p>Its name, size and what makes it special.</p><div className="record-area"><button className={'voice-circle '+(recording?'recording':'')} aria-label={recording?'Stop recording':'Tap to Speak'} onClick={()=>{if(recording){setRecording(false)}else{setRecording(true);setSeconds(0)}}}>{recording?<Stop size={44}/>:<Microphone size={54}/>}<span>{recording?'Stop':'Tap to Speak'}</span></button><p>{recording?`0:${String(seconds).padStart(2,'0')} · Recording demo`:'Voice interaction preview'}</p></div><div className="translation-fields"><label className="field">Hindi Translation<textarea value={hindiTranslation} onChange={e=>setHindiTranslation(e.target.value)} readOnly /></label><label className="field">English Translation<textarea value={englishTranslation} onChange={e=>setEnglishTranslation(e.target.value)} readOnly /></label></div><Button onClick={()=>go('Check Details')}>Continue <ArrowRight/></Button></>;
 case 'Check Details':return <><h1>Does this look right?</h1><p>Check the details before continuing. Only keep information you can confirm.</p><div className="details">{(['name','category','size','craft'] as const).map(k=><Field key={k} label={({name:'Product Name',category:'Category',size:'Size',craft:'Craft / Technique'})[k]} value={product[k]} onChange={v=>update(k,v)} placeholder="Not specified"/>)}<div className="material-selection"><Field label="Material" value={product.material} onChange={v=>update('material',v)} placeholder="Not specified"/><div className="material-suggestions"><span className="eyebrow">SUGGESTIONS</span><div className="choices">{['Natural fibre','Bamboo'].map(v=><button className={product.material===v?'selected':''} onClick={()=>update('material',v)} key={v}>{v}</button>)}</div></div></div></div><label className="field">Short Description<KeyboardTextarea value={product.description} onChange={e=>update('description',e.target.value)}/></label><Button disabled={!product.name.trim()} onClick={()=>go('Smart Pricing')}>Confirm Details <ArrowRight/></Button><Button secondary onClick={()=>save('Draft')}>Save as Draft</Button></>;
 case 'Add Photos':return <><h1>Let your product shine</h1><p>Add a clear photo of the actual product.</p><div className="upload-box"><Camera size={54} weight="light"/><h2>Add product photos</h2><Button onClick={()=>{keyboard.hide();setSheet('Camera')}}><Camera/> Take Photo</Button><Button secondary onClick={()=>{if(file.current){file.current.value='';file.current.click()}}}><UploadSimple/> Upload Photo</Button></div><div className="photo-tips"><span><Sun/>Good lighting</span><span><Crosshair/>Keep centered</span><span><ImageIcon/>Clean background</span></div><Button secondary onClick={()=>{update('photo','/assets/basket.png');setEnhanced(false);setSelectedPhoto('original');go('Photo Review')}}>Use Sample Photo</Button><p className="muted">Your product's colour, shape and craft stay yours.</p></>;
 case 'Photo Review':{const photoOptions=[{id:'original' as const,label:'Original',src:product.photo},{id:'enhanced1' as const,label:'Enhanced Image 1',src:product.photo},{id:'enhanced2' as const,label:'Enhanced Image 2',src:product.photo}]; const selected=photoOptions.find(option=>option.id===selectedPhoto)||photoOptions[0]; return <><h1>A clearer first impression</h1><p>Keep the product true to life.</p>{busy?<div className="note" role="status">Preparing your product photo…</div>:!enhanced?<Button onClick={()=>{setBusy(true);setTimeout(()=>{setEnhanced(true);setSelectedPhoto('original');setBusy(false)},800)}}><Sparkle/> Enhance Photo</Button>:<><div className="photo-options">{photoOptions.map(option=><button key={option.id} type="button" className={'photo-option '+(selectedPhoto===option.id?'selected':'')} onClick={()=>setSelectedPhoto(option.id)}><img src={option.src} alt={option.label}/><span>{option.label}</span>{selectedPhoto===option.id&&<CheckCircle size={20}/>}</button>)}</div><div className="note"><CheckCircle/> Choose any one of the three photos.</div></>}<p className="muted">For now, all three options use the original image. Your backend can replace Enhanced Image 1 and Enhanced Image 2 later.</p><Button disabled={!selected} onClick={()=>{setProduct(p=>({...p,photo:selected.src}));go('Tell Your Story')}}>Use This Photo <ArrowRight/></Button><Button secondary onClick={()=>go('Add Photos')}>Choose Another Photo</Button></>;};
 case 'Listing Preview':return <><h1>Your listing, coming together</h1><img className="large-product" src={product.photo} alt={product.name}/><h2>{product.name}</h2><p>{product.description||'Add a short description before publishing.'}</p><div className="attributes"><span>{product.category||'Category unspecified'}</span><span>{product.material||'Material unspecified'}</span><span>{product.size||'Size unspecified'}</span>{product.craft&&<span>{product.craft}</span>}</div><p className="muted">Tags: {product.category?product.category.toLowerCase():'not specified'}</p><Button secondary onClick={()=>go('Check Details')}><PencilSimple/> Edit Details</Button><Button onClick={()=>go('Smart Pricing')}>Continue to Pricing <ArrowRight/></Button></>;
 case 'Smart Pricing':return <><h1>You choose your price</h1><p>What is the minimum price you are willing to accept?</p><section className="pricing-card"><small>SUGGESTED PRICE RANGE</small><h1>₹850 – ₹1,050</h1><p>Based on similar products and current market prices.</p><span className="pill">Illustrative sample range</span></section><Field label="Selected Selling Price (₹)" value={product.price} onChange={v=>update('price',v)} type="number" placeholder="Choose your price"/><div className="choices prices">{['850','950','1050'].map(v=><button disabled={+v<+product.minimum} className={product.price===v?'selected':''} onClick={()=>update('price',v)} key={v}>₹{v}</button>)}</div>{+product.minimum>1050&&<p className="note">The sample range is below your minimum. Choose a price that works for you.</p>}{product.price&&+product.price<+product.minimum&&<p className="error">Selling price must meet your minimum.</p>}<p className="muted">The recommendation is a guide. The final price is always yours.</p><Button disabled={!product.price} onClick={()=>go('Pricing Preview')}>Review Listing <ArrowRight/></Button></>;
 case 'Pricing Preview':return <><h1>Your listing, coming together</h1><img className="large-product" src={product.photo} alt={product.name}/><h2>{product.name}</h2><p>{product.description||'Add a short description before publishing.'}</p><div className="attributes"><span>{product.category||'Category unspecified'}</span><span>{product.material||'Material unspecified'}</span><span>{product.size||'Size unspecified'}</span>{product.craft&&<span>{product.craft}</span>}</div><p className="muted">Tags: {product.category?product.category.toLowerCase():'not specified'}</p><Button secondary onClick={()=>go('Check Details')}><PencilSimple/> Edit Details</Button><div className="price-row"><span>Price</span><strong>₹{product.price}</strong></div><Button onClick={()=>go('Final Review')}>Continue <ArrowRight/></Button></>;
 case 'Final Review':return <><h1>Ready to share your craft?</h1>{mini(product)}<div className="info-card"><h3>Product Details</h3><p>{product.description}</p><p>{[product.material,product.size,product.craft].filter(Boolean).join(' · ')||'Additional attributes unspecified'}</p><button className="text-button" onClick={()=>go('Check Details')}>Edit Details</button></div><div className="price-row"><span>Selling Price</span><strong>₹{product.price}</strong><button aria-label="Edit price" className="icon-button" onClick={()=>go('Smart Pricing')}><PencilSimple/></button></div><Field label="Available Quantity" value={product.quantity} type="number" onChange={v=>update('quantity',v)} placeholder="e.g. 12"/><Field label="Delivery Estimate" value={product.delivery} onChange={v=>update('delivery',v)} placeholder="e.g. 7–10 days"/><Button disabled={!product.name||!product.photo||+product.price<=0||+product.price<+product.minimum||!product.quantity||+product.quantity<=0||!Number.isInteger(+product.quantity)||!product.delivery.trim()} onClick={()=>save('Live')}>Publish Product <ArrowRight/></Button><Button secondary onClick={()=>save('Draft')}>Save as Draft</Button><p className="muted">Publishing updates this prototype's sample catalogue.</p></>;
 case 'Published':return <div className="success"><CheckCircle size={80} weight="light"/><h1>Your product is live!</h1><p>A new beginning for your craft.</p>{mini(product)}<Button onClick={()=>tab('Products')}>View My Products</Button><Button secondary onClick={()=>tab('Home')}>Back to Home</Button></div>;
 case 'Products':return <><div className="heading-row"><div><h1>My Products</h1><p>Your craft, in one place.</p></div><button className="icon-button amber" aria-label="Create product" onClick={start}><Plus/></button></div><div className="segmented filters">{['All','Live','Draft','Out of Stock'].map(v=><button key={v} className={filter===v?'active':''} onClick={()=>setFilter(v)}>{v}</button>)}</div><div className="product-grid">{products.filter(p=>filter==='All'||p.status===filter).map((p,i)=><button className="product-card" key={i} onClick={()=>{setEditingIndex(products.indexOf(p));setProduct({...p});go('Product Detail')}}><div className="product-media">{p.photo?<img src={p.photo} alt={p.name||'Draft'}/>:<span><ImageIcon size={35}/>Photo not added</span>}</div><div><span className="pill">{p.status}</span><h3>{p.name||'Untitled product'}</h3><strong>{p.price?'₹'+p.price:'Price not set'}</strong><p>{p.quantity||0} available</p></div></button>)}</div>{!products.some(p=>filter==='All'||p.status===filter)&&<p>No products here yet.</p>}</>;
 case 'Product Detail':return <>{product.photo?<img className="large-product" src={product.photo} alt={product.name}/>:<div className="upload-box"><ImageIcon size={40}/><p>Photo not added yet</p></div>}<span className="pill">{product.status}</span><h1>{product.name||'Untitled product'}</h1><h2>₹{product.price||'—'}</h2><p>{product.description}</p><div className="info-card"><p>{product.quantity||0} available</p><p>Delivery: {product.delivery||'Not set'}</p></div><Button onClick={()=>go('Check Details')}><PencilSimple/> Edit Listing</Button>{product.status!=='Draft'&&<Button secondary onClick={()=>{const status=product.status==='Out of Stock'?'Live':'Out of Stock';setProducts(ps=>ps.map(p=>p.name===product.name?{...p,status}:p));update('status',status);tell('Availability updated')}}>{product.status==='Out of Stock'?'Mark Available':'Mark Out of Stock'}</Button>}</>;
 case 'Marketplace':return <>
   <div className="heading-row">
    <div><h1>{language==='Hindi'?'मार्केटप्लेस':'Marketplace'}</h1><p>{language==='Hindi'?'देखें कि आपके उत्पाद किन ऑनलाइन मार्केटप्लेस पर सूचीबद्ध हैं।':'See which online marketplaces your products are listed on.'}</p></div>
    <span className="pill">{language==='Hindi'?'डेमो मार्केट':'Demo marketplace'}</span>
   </div>

   <button className="link-marketplace-entry" onClick={()=>go('Link to Marketplace')}>
    <span className="link-marketplace-entry-icon"><Globe size={22}/></span>
    <span className="link-marketplace-entry-copy"><strong>{language==='Hindi'?'मार्केटप्लेस से लिंक करें':'Link to Marketplace'}</strong><small>{language==='Hindi'?'मार्केटप्लेस कनेक्शन विकल्प देखें':'View marketplace connection options'}</small></span>
    <ArrowRight size={19}/>
   </button>

   <section className="marketplace-note">
    <Storefront size={24}/>
    <div><strong>{language==='Hindi'?'आपका उत्पाद कहाँ सूचीबद्ध है':'Where is your product listed?'}</strong><p>{language==='Hindi'?'किसी वेबसाइट पर जाने के लिए उसका बटन दबाएँ।':'Tap a marketplace button to open its website.'}</p></div>
   </section>
   <div className="marketplace-products">
    {products.filter(p=>p.status==='Live').map((p,i)=><section className="marketplace-product" key={i}>
      <div className="marketplace-product-header">
       <img src={p.photo||'/assets/basket.png'} alt={p.name}/>
       <div><span className="pill">{p.craft}</span><h2>{p.name}</h2><strong>₹{p.price}</strong></div>
      </div>
      <div className="marketplace-sites">
       {marketplaces.map(site=><div className="marketplace-site" key={site.name}>
        <div><strong>{site.name}</strong><small>{site.listed?(language==='Hindi'?'सूचीबद्ध':'Listed'):(language==='Hindi'?'कनेक्ट नहीं है':'Not connected')}</small></div>
        <a href={site.url} target="_blank" rel="noreferrer">{site.listed?(language==='Hindi'?'वेबसाइट देखें':'Visit site'):(language==='Hindi'?'वेबसाइट खोलें':'Open site')} <ArrowRight size={16}/></a>
       </div>)}
      </div>
      <p className="muted marketplace-demo-note">{language==='Hindi'?'डेमो में मार्केटप्लेस स्थिति उदाहरण के लिए दिखाई गई है। वास्तविक प्रोडक्ट लिंक बाद में जोड़े जा सकते हैं।':'Marketplace status is shown as demo data. Real product links can be added later.'}</p>
    </section>)}
   </div>
  </>;
 case 'Link to Marketplace':return <>
   <div className="heading-row">
    <div><h1>{language==='Hindi'?'मार्केटप्लेस से लिंक करें':'Link to Marketplace'}</h1><p>{language==='Hindi'?'अपने उत्पाद के लिए मार्केटप्लेस कनेक्शन देखें।':'Choose a marketplace connection for your product.'}</p></div>
   </div>

   <section className="marketplace-note">
    <Storefront size={24}/>
    <div><strong>{language==='Hindi'?'मार्केटप्लेस चुनें':'Where is your product listed?'}</strong><p>{language==='Hindi'?'कनेक्शन उपलब्ध होने पर आप अपने उत्पाद को यहां से लिंक कर पाएंगे।':'Marketplace connections will be available here when permission is enabled.'}</p></div>
   </section>

   <div className="marketplace-products">
    {products.filter(p=>p.status==='Live').map((p,i)=><section className="marketplace-product" key={i}>
      <div className="marketplace-product-header">
       <img src={p.photo||'/assets/basket.png'} alt={p.name}/>
       <div><span className="pill">{p.craft}</span><h2>{p.name}</h2><strong>₹{p.price}</strong></div>
      </div>
      <div className="marketplace-sites">
       {marketplaces.map(site=><div className="marketplace-site marketplace-site-disabled" key={site.name} aria-disabled="true">
        <div><strong>{site.name}</strong><small>{language==='Hindi'?'अभी उपलब्ध नहीं':'Not available yet'}</small></div>
        <span className="unsupported-status">Unsupported</span>
       </div>)}
      </div>
      <p className="muted marketplace-demo-note">{language==='Hindi'?'मार्केटप्लेस लिंकिंग अभी उपलब्ध नहीं है क्योंकि आवश्यक अनुमति अभी नहीं मिली है।':'Marketplace linking is currently unavailable because the required permission is not available yet.'}</p>
    </section>)}
   </div>
  </>;
 case 'Enquiries':return <><h1>Buyer Enquiries</h1><p>New connections for your craft.</p><span className="pill">Sample enquiries</span><section className="enquiry-card"><div className="heading-row"><h2>The Earth Store</h2><span className="pill">{responded?'Replied':'New'}</span></div><p>Business buyer · New Delhi</p><div className="product-summary"><img src="/assets/basket.png" alt="Woven basket"/><div><h3>Handwoven Storage Basket</h3><p>20 pieces required</p></div></div><div className="facts"><span>Required by</span><strong>25 Sep 2026</strong><span>Customisation</span><strong>Natural colour, gift tags</strong></div><Button onClick={()=>go('View Request')}>View Request <ArrowRight/></Button></section></>;
 case 'View Request':return <><h1>The Earth Store</h1><p>Business buyer · New Delhi</p>{mini({...sample})}<div className="info-card facts"><span>Quantity Required</span><strong>20 pieces</strong><span>Requested Date</span><strong>25 Sep 2026</strong><span>Customisation</span><strong>Natural colour, gift tags</strong><span>Location</span><strong>New Delhi</strong></div>{responded&&<div className="note"><CheckCircle/> Your response is saved in this demo.</div>}<Button onClick={()=>go('Respond')}>{responded?'Edit Response':'Respond'} <ArrowRight/></Button></>;
 case 'Respond':return <><h1>Make it clear and simple</h1><p>Your response to The Earth Store.</p>{[['quantity','Available Quantity'],['price','Bulk Price per Piece (₹)'],['timeline','Delivery Timeline'],['charges','Additional Charges (₹)']].map(([k,label])=><Field key={k} label={label} value={reply[k as keyof typeof reply]} type={['quantity','price','charges'].includes(k)?'number':'text'} onChange={v=>setReply(r=>({...r,[k]:v}))}/>)}<label className="field">Customisation Possible<select value={reply.custom} onChange={e=>setReply(r=>({...r,custom:e.target.value}))}><option>Yes</option><option>No</option><option>Partly</option></select></label><label className="field">Optional Message<KeyboardTextarea value={reply.message} onChange={e=>setReply(r=>({...r,message:e.target.value}))} placeholder="Anything else the buyer should know?"/></label><Button disabled={+reply.quantity<=0||+reply.price<=0||+reply.charges<0||!reply.timeline.trim()} onClick={()=>{setResponded(true);setRequestStatus('Discussion');go('View Request');tell('Response saved in the prototype.')}}>Send Response <ArrowRight/></Button></>;
 case 'Requests':return <><h1>Orders / Requests</h1><p>Keep track of buyer interest.</p><span className="pill">Sample request</span><button className="enquiry-card request-link" onClick={()=>go('Request Detail')}><div className="heading-row"><h2>The Earth Store</h2><CaretRight/></div><span className="pill">{requestStatus}</span><p>Handwoven Storage Basket</p><div className="facts"><span>Quantity</span><strong>20 pieces</strong><span>Agreed price</span><strong>{requestStatus==='New Request'?'Not agreed':`₹${reply.price} / piece`}</strong><span>Required date</span><strong>25 Sep 2026</strong></div></button></>;
 case 'Request Detail':return <><h1>Request Details</h1><span className="pill">{requestStatus}</span>{mini({...sample})}<div className="info-card"><h3>The Earth Store</h3><p>20 pieces · New Delhi</p><p>Required by 25 Sep 2026</p><p>{requestStatus==='New Request'?'Price not agreed':`Agreed price: ₹${reply.price} per piece`}</p></div><p>This tracks order intent. Confirm arrangements with the buyer.</p>{requestStatus==='New Request'?<Button onClick={()=>go('Respond')}>Discuss Request</Button>:requestStatus==='Discussion'?<Button onClick={()=>{setRequestStatus('Accepted');tell('Request accepted in this demo.')}}>Accept Request</Button>:requestStatus==='Accepted'?<Button onClick={()=>{setRequestStatus('Completed');tell('Request marked completed.')}}>Mark Completed</Button>:<div className="note"><CheckCircle/> Request completed</div>}</>;
 case 'Demo Videos':return <><h1>{language==='Hindi'?'डेमो वीडियो':'Demo Videos'}</h1><p>{language==='Hindi'?'करिगर कार्ट का उपयोग कैसे करें, यह आसान वीडियो में देखें।':'Learn how to use Karigar Kart through these simple demo videos.'}</p><div className="demo-video-list"><section className="demo-video-card"><video controls preload="metadata" src="/assets/demo-getting-started.mp4"/><div><span className="pill">1</span><h2>{language==='Hindi'?'शुरुआत कैसे करें':'Getting Started'}</h2><p>{language==='Hindi'?'लॉगिन से होम स्क्रीन तक ऐप का बेसिक उपयोग।':'From login to the home screen and the basic app flow.'}</p></div></section><section className="demo-video-card"><video controls preload="metadata" src="/assets/demo-create-listing.mp4"/><div><span className="pill">2</span><h2>{language==='Hindi'?'उत्पाद लिस्टिंग बनाएं':'Create a Product Listing'}</h2><p>{language==='Hindi'?'अपनी कला को बोलकर या टाइप करके लिस्टिंग बनाना सीखें।':'See how to start a listing, add details and publish your craft.'}</p></div></section><section className="demo-video-card"><video controls preload="metadata" src="/assets/demo-profile.mp4"/><div><span className="pill">3</span><h2>{language==='Hindi'?'प्रोफाइल और भाषा':'Profile & Language'}</h2><p>{language==='Hindi'?'प्रोफाइल, QR कोड, कला श्रेणी और हिंदी/अंग्रेज़ी भाषा बदलना सीखें।':'Learn profile editing, QR code, craft selection and language switching.'}</p></div></section></div></>;
 case 'Insights':return <><h1>A little insight, a new idea</h1><p>This week · 7–13 Sep 2026</p><span className="pill">Illustrative activity</span><div className="stats"><div><Eye/><p>Product Views</p><h1>248</h1></div><div><ChatCircleDots/><p>Buyer Enquiries</p><h1>12</h1></div></div><section className="info-card"><h2>Most Viewed Product</h2>{mini(sample)}<p>86 views this week</p></section><section className="info-card"><h2>Approximate Price Trend</h2><div className="trend-values"><span>Aug<br/><strong>₹900</strong></span><ArrowRight/><span>Sep<br/><strong>₹950</strong></span></div><p>Sample prices for similar baskets</p></section><div className="note">Your handwoven baskets received the most buyer interest this week.</div><Button onClick={()=>tab('Products')}>View My Products</Button></>;
 case 'Profile':{
   const craftCategories=[
     ['Basket Weaving','Natural Fibre'],['Pottery','Clay'],['Embroidery','Textile'],['Wood Carving','Wood'],['Handloom & Textiles','Textile'],['Painting & Folk Art','Art'],['Jewellery','Metal'],['Metal Craft','Metal'],['Bamboo Craft','Natural Fibre'],['Leather Craft','Leather'],['Cane Craft','Natural Fibre'],['Terracotta','Clay']
   ] as const;
   const filteredCrafts=craftCategories.filter(([name,type])=>
     (craftFilter==='All'||type===craftFilter) &&
     name.toLowerCase().includes(craftSearch.toLowerCase().trim())
   );
   const currentCraft=craftCategories.find(([name])=>name===profile.craft);
   const selectedCraftOptions=currentCraft && !filteredCrafts.some(([name])=>name===profile.craft)?[currentCraft,...filteredCrafts]:filteredCrafts.length?filteredCrafts:currentCraft?[currentCraft]:craftCategories;
   return <div className="profile-section">
   {profileScrolled&&<div className="profile-collapsed"><img src="/assets/avatar.png" alt={`${profile.name} profile`}/><div><strong>{profile.name}</strong><span>{profile.craft}</span></div></div>}
   <div className="profile-hero"><img src="/assets/avatar.png" alt={`${profile.name} profile`}/><div><span className="eyebrow">{language==='Hindi'?'आपकी प्रोफाइल':'YOUR PROFILE'}</span><h1>{profile.name}</h1><p>{profile.business}</p><span className="profile-craft-pill">{profile.craft}</span></div></div>
   <section className="profile-card qr-card"><div><div className="qr-title"><QrCode size={22}/><strong>{language==='Hindi'?'आपका व्यक्तिगत QR कोड':'Your Personal QR Code'}</strong></div><p>{language==='Hindi'?'इसे स्कैन करके आपकी कारीगर प्रोफाइल की जानकारी देखी जा सकती है।':'Scan to view this artisan profile information.'}</p></div><img className="profile-qr" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`Karigar Kart Artisan|${profile.name}|${profile.business}|${profile.craft}|${profile.location}|${profile.phone}|${profile.contact}`)}`} alt="Personal artisan QR code"/></section>
   <section className="profile-card">
     <div className="section-title-row"><div><span className="eyebrow">{language==='Hindi'?'प्रोफाइल':'PROFILE'}</span><h2>{language==='Hindi'?'आपकी प्रोफाइल':'Your Profile'}</h2></div><Button secondary onClick={()=>setEditProfile(!editProfile)}><PencilSimple size={18}/>{editProfile?(language==='Hindi'?'बंद करें':'Close'):(language==='Hindi'?'प्रोफाइल संपादित करें':'Edit Profile')}</Button></div>
     {editProfile?
       <>
         <Field label={language==='Hindi'?'नाम':'Name'} value={profile.name} onChange={v=>setProfile(p=>({...p,name:v}))}/>
         <Field label={language==='Hindi'?'व्यवसाय / कारीगर का नाम':'Business / Artisan Name'} value={profile.business} onChange={v=>setProfile(p=>({...p,business:v}))}/>
         <Field label={language==='Hindi'?'स्थान':'Location'} value={profile.location} onChange={v=>setProfile(p=>({...p,location:v}))}/>
         <Field label={language==='Hindi'?'मोबाइल नंबर':'Mobile Number'} value={profile.phone} onChange={v=>setProfile(p=>({...p,phone:v}))}/>
         <Field label={language==='Hindi'?'ईमेल':'Email'} value={profile.contact} onChange={v=>setProfile(p=>({...p,contact:v}))}/>
         <Button onClick={()=>{setEditProfile(false);tell(language==='Hindi'?'प्रोफाइल अपडेट हो गई।':'Profile updated successfully.')}}><Check/> {language==='Hindi'?'प्रोफाइल सेव करें':'Save Profile'}</Button>
       </>
       :
       <>
         <div className="profile-facts">
           <div><span>{language==='Hindi'?'नाम':'Name'}</span><strong>{profile.name}</strong></div>
           <div><span>{language==='Hindi'?'व्यवसाय':'Business'}</span><strong>{profile.business}</strong></div>
           <div><span>{language==='Hindi'?'स्थान':'Location'}</span><strong>{profile.location}</strong></div>
           <div><span>{language==='Hindi'?'मोबाइल':'Mobile'}</span><strong>{profile.phone}</strong></div>
           <div><span>{language==='Hindi'?'ईमेल':'Email'}</span><strong>{profile.contact}</strong></div>
         </div>
         <div className="profile-craft-selector">
           <div className="section-title-row craft-selector-heading"><div><span className="eyebrow">{language==='Hindi'?'कला':'CRAFT'}</span><h3>{language==='Hindi'?'कला श्रेणी':'Craft Category'}</h3></div><Sparkle size={20}/></div>
           <div className="craft-search-row">
             <input value={craftSearch} onChange={e=>setCraftSearch(e.target.value)} placeholder={language==='Hindi'?'कला खोजें...':'Search craft category...'} aria-label={language==='Hindi'?'कला खोजें':'Search craft category'}/>
             <select value={craftFilter} onChange={e=>setCraftFilter(e.target.value)} aria-label={language==='Hindi'?'कला फ़िल्टर':'Filter craft categories'}>
               <option value="All">{language==='Hindi'?'सभी प्रकार':'All types'}</option>
               <option value="Natural Fibre">{language==='Hindi'?'प्राकृतिक फाइबर':'Natural Fibre'}</option>
               <option value="Textile">{language==='Hindi'?'टेक्सटाइल':'Textile'}</option>
               <option value="Clay">{language==='Hindi'?'मिट्टी':'Clay'}</option>
               <option value="Wood">{language==='Hindi'?'लकड़ी':'Wood'}</option>
               <option value="Metal">{language==='Hindi'?'धातु':'Metal'}</option>
               <option value="Art">{language==='Hindi'?'कला':'Art'}</option>
               <option value="Leather">{language==='Hindi'?'चमड़ा':'Leather'}</option>
             </select>
           </div>
           <label className="craft-picker-label">{language==='Hindi'?'अपनी कला चुनें':'Select your craft'}
             <select value={profile.craft} onChange={e=>{setProfile(p=>({...p,craft:e.target.value}));tell(language==='Hindi'?`${e.target.value} चुना गया`:`${e.target.value} selected`)}}>
               {selectedCraftOptions.map(([name])=><option key={name} value={name}>{name}</option>)}
             </select>
           </label>
           <p className="craft-result-count">{filteredCrafts.length} {language==='Hindi'?'कला विकल्प मिले':'craft options match your search'}</p>
           {filteredCrafts.length===0&&<p className="muted craft-empty">{language==='Hindi'?'इस फ़िल्टर में कोई कला नहीं मिली। फ़िल्टर बदलें।':'No craft matches this search. Change the filter or search.'}</p>}
         </div>
       </>
     }
   </section>
   <section className="profile-card feedback-card"><div className="section-title-row feedback-title"><ChatText size={24}/><div><span className="eyebrow">{language==='Hindi'?'कारीगरों की आवाज':'VOICE OF ARTISANS'}</span><h2>{language==='Hindi'?'सुझाव और प्रतिक्रिया':'Suggestions & Feedback'}</h2></div></div><p>{language==='Hindi'?'अपने सुझाव या समस्या हमारे साथ साझा करें।':'Tell us what we can improve for artisans.'}</p><textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder={language==='Hindi'?'अपना सुझाव या प्रतिक्रिया लिखें...':'Write your suggestion or feedback...'} /><Button disabled={!feedback.trim()} onClick={()=>{setFeedback('');tell(language==='Hindi'?'धन्यवाद! आपकी प्रतिक्रिया दर्ज हो गई।':'Thank you! Your feedback has been submitted.')}}><Check/> {language==='Hindi'?'सबमिट करें':'Submit Feedback'}</Button></section>
   <button className="list-row" onClick={()=>setSheet('Language')}><span><Globe size={20}/> {language==='Hindi'?'भाषा':'Language'}</span><strong>{language==='Hindi'?'हिंदी':'English'}</strong><CaretRight/></button>
   <button className="list-row" onClick={()=>setSheet('Help')}><span><Question size={20}/> {language==='Hindi'?'सहायता और सपोर्ट':'Help & Support'}</span><CaretRight/></button>
   <button className="list-row" onClick={()=>setSheet('About Karigar Kart')}><span><Info size={20}/> {language==='Hindi'?'करिगर कार्ट के बारे में':'About Karigar Kart'}</span><CaretRight/></button>
   <button className="list-row" onClick={()=>setSheet('Account Settings')}><span>{language==='Hindi'?'अकाउंट सेटिंग्स':'Account Settings'}</span><CaretRight/></button>
   <button className="list-row logout-row" onClick={()=>go('Welcome')}><span><SignOut size={20}/> {language==='Hindi'?'लॉगआउट':'Logout'}</span><CaretRight/></button>
 </div>};
 case 'Welcome':return <LegacyWelcome go={go} tab={tab} tell={tell}/>;
 case 'Login':case 'Sign Up':return <LegacyAuth page={page as 'Login' | 'Sign Up'} go={go} tab={tab} tell={tell}/>;
 case 'Forgot Password':return <><h1>Forgot your password?</h1><p>Enter your registered mobile number.</p><label className="field">Mobile Number<div className="auth-input-with-icon"><Phone size={20}/><KeyboardInput type="tel" inputMode="numeric" maxLength={10} value={auth.mobile} onChange={e=>setAuth(a=>({...a,mobile:e.target.value.replace(/\D/g,'').slice(0,10)}))} placeholder="Enter 10-digit mobile number"/></div></label><Button disabled={!/^\d{10}$/.test(auth.mobile)} onClick={()=>tell('Recovery OTP demo sent. No SMS was sent.')}>Send OTP</Button></>;
 default:return null;
 }};
 if(authPage){
   if(page==='Welcome') return <LegacyWelcome go={go} tab={tab} tell={tell}/>;
   if(page==='Login' || page==='Sign Up') return <LegacyAuth page={page} go={go} tab={tab} tell={tell}/>;
   return <div className="legacy-auth-page legacy-form-page"><div className="legacy-auth-card"><h1>Forgot your password?</h1><p className="legacy-auth-subtitle">Enter your registered mobile number.</p><button className="legacy-back-button" onClick={()=>go('Login')}><ArrowLeft size={22}/> Back</button></div></div>;
 }
 return <div className="kk-app"><header className="kk-header">{page==='Home'?<><Brand/><div className="header-actions"><button className="icon-button" aria-label="Notifications" onClick={()=>setSheet('Notifications')}><Bell size={22}/><i/></button><button className="icon-button" aria-label="Language" onClick={()=>setSheet('Language')}><Globe size={23}/></button></div></>:<><button className="icon-button" aria-label="Back" onClick={back}><ArrowLeft size={23}/></button><strong>{stage?'Create Listing':authPage?'Karigar Kart':page}</strong><span className="header-count">{stage?`${stage} of 4`:''}</span></>}</header>{stage>0&&<div className="stepper" aria-label={`Step ${stage} of 4`}>{[1,2,3,4].map(n=><span key={n} className={n<=stage?'done':''}/>)}</div>}<MobileScroll key={page} className="kk-scroll"><main className={'kk-content '+(page==='Home'?'home-content':'')}>{content()}</main></MobileScroll>{navVisible&&<nav className="bottom-nav" aria-label="Main navigation" style={{bottom:bottomInset}}>{navItems.map(([name,Icon])=><button className={page===name?'active':''} key={name} onClick={()=>tab(name)}><Icon size={27} weight={page===name?'fill':'light'}/><span>{name}</span></button>)}</nav>}{notice&&<div className="toast" role="status" style={{bottom:bottomInset+88}}><CheckCircle size={22}/>{notice}</div>}<input ref={file} type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files?.[0];if(f){if(!f.type.startsWith('image/')){tell('Please choose an image.');return;}update('photo',URL.createObjectURL(f));setEnhanced(false);setSelectedPhoto('original');go('Photo Review')}}}/><BottomSheet open={!!sheet} onOpenChange={open=>!open&&setSheet('')} title={language==='Hindi' ? ({Camera:'कैमरा',Notifications:'सूचनाएँ',Language:'भाषा',Help:'सहायता और सपोर्ट','About Karigar Kart':'करिगर कार्ट के बारे में','Account Settings':'अकाउंट सेटिंग्स','Terms & Conditions':'नियम और शर्तें'} as Record<string,string>)[sheet] || sheet : sheet}>
 {sheet!=='Camera'&&<div className="kk-sheet">
  {sheet==='Notifications'?
    <><h3>{language==='Hindi'?'खरीदार की एक नई पूछताछ':'One new buyer enquiry'}</h3><p>{language==='Hindi'?'द अर्थ स्टोर 20 बास्केट में रुचि रखता है।':'The Earth Store is interested in 20 baskets.'}</p><Button onClick={()=>{setSheet('');go('Enquiries')}}>{language==='Hindi'?'पूछताछ देखें':'View Enquiries'}</Button></>
   :sheet==='Language'?
    <><h3>{language==='Hindi'?'अपनी भाषा चुनें':'Choose your language'}</h3><div className="language-options"><button className={language==='English'?'selected':''} onClick={()=>{setLanguage('English');setSheet('');tell('English selected')}}>English <CheckCircle/></button><button className={language==='Hindi'?'selected':''} onClick={()=>{setLanguage('Hindi');setSheet('');tell('हिंदी चुनी गई')}}>हिंदी <CheckCircle/></button></div><p className="muted">{language==='Hindi'?'चुनी गई भाषा इस सत्र के लिए सेव है।':'The selected language is saved for this session.'}</p></>
   :sheet==='Help'?
    <><h3>{language==='Hindi'?'सहायता और सपोर्ट':'Help & Support'}</h3><p>{language==='Hindi'?'लिस्टिंग, ऑर्डर या प्रोफाइल में मदद चाहिए? हमारी डेमो सपोर्ट टीम से संपर्क करें।':'Need help with listings, orders or your profile? Contact our demo support team.'}</p><div className="support-contact"><strong>{language==='Hindi'?'मोबाइल 1':'Mobile 1'}</strong><a href="tel:+919876543210">+91 98765 43210</a><strong>{language==='Hindi'?'मोबाइल 2':'Mobile 2'}</strong><a href="tel:+919112233445">+91 91122 33445</a><strong>{language==='Hindi'?'ईमेल 1':'Email 1'}</strong><a href="mailto:support@karigarkart.demo">support@karigarkart.demo</a><strong>{language==='Hindi'?'ईमेल 2':'Email 2'}</strong><a href="mailto:help@karigarkart.demo">help@karigarkart.demo</a></div></>
   :sheet==='About Karigar Kart'?
    <><h3>{language==='Hindi'?'करिगर कार्ट के बारे में':'About Karigar Kart'}</h3><p>{language==='Hindi'?'करिगर कार्ट एक डिजिटल प्लेटफॉर्म है जो कारीगरों को अपने हस्तनिर्मित उत्पाद दिखाने, खरीदारों से जुड़ने और अपने शिल्प-आधारित व्यवसाय को बढ़ाने में मदद करता है।':'Karigar Kart is a digital platform designed to help artisans present their handmade products, connect with buyers and grow their craft-based business.'}</p><p>{language==='Hindi'?'हमारा लक्ष्य कारीगरों के लिए अपनी कहानी बताना, अपना काम दिखाना, खरीदारों की पूछताछ पाना और एक ही जगह से उत्पाद लिस्टिंग प्रबंधित करना आसान बनाना है।':'Our goal is to make it easier for artisans to tell their story, showcase their work, receive buyer enquiries and manage product listings from one place.'}</p></>
   :sheet==='Account Settings'?
    <><p>{language==='Hindi'?'यह इंटरैक्टिव डेमो सैंपल डेटा का उपयोग करता है। बदलाव पेज रिफ्रेश होने तक रहेंगे।':'This interactive demo uses sample data. Changes last until the page is refreshed.'}</p><Button secondary onClick={()=>{setSheet('');go('Forgot Password')}}>{language==='Hindi'?'पासवर्ड रिकवरी':'Password Recovery'}</Button></>
   :<p>{language==='Hindi'?'केवल प्रोटोटाइप नियमों का प्रीव्यू। वास्तविक सेवा रजिस्ट्रेशन से पहले पूरी नियम और प्राइवेसी नीति देगी।':'Prototype terms preview only. A production service will provide its full terms and privacy policy before registration.'}</p>}
  <Button secondary onClick={()=>setSheet('')}>{language==='Hindi'?'बंद करें':'Close'}</Button>
 </div>}
{sheet==='Camera'&&<><ProductCamera hindi={language==='Hindi'} onCapture={photo=>{setSheet('');update('photo',photo);setEnhanced(false);setSelectedPhoto('original');go('Photo Review')}}/><Button secondary onClick={()=>setSheet('')}>{language==='Hindi'?'रद्द करें':'Cancel'}</Button></>}
</BottomSheet></div>
}
