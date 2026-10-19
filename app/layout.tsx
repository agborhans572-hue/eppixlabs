import type {Metadata} from 'next';
import {Analytics} from '@vercel/analytics/next';
import {readPage} from '@/lib/catalog';
import {AmbientBackground} from '@/components/ambient-background';
import {siteOrigin} from '@/lib/site';
import './enhancements.css';
import './canada.css';
import './mobile-fidelity.css';
import './checkout.css';
import './seo.css';
export const metadata:Metadata={metadataBase:new URL(siteOrigin()),title:'Eppix Labs',description:'Research catalog and published laboratory reports for the United States and Canada.',icons:{icon:'/icon.png',apple:'/apple-icon.png'},verification:{google:process.env.GOOGLE_SITE_VERIFICATION,other:process.env.BING_SITE_VERIFICATION?{'msvalidate.01':process.env.BING_SITE_VERIFICATION}:undefined}};
export default function Layout({children}:{children:React.ReactNode}){const home=readPage('/');return <html lang="en-US" suppressHydrationWarning><head>{home?.styles.map(href=><link key={href} rel="stylesheet" href={href}/>)}<script dangerouslySetInnerHTML={{__html:`try{if(localStorage.getItem('eppix-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`}}/></head><body className={home?.bodyClass}><AmbientBackground/>{children}<Analytics/></body></html>;}
