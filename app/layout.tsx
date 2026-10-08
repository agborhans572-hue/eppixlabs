import type {Metadata} from 'next';
import {readPage} from '@/lib/catalog';
import {AmbientBackground} from '@/components/ambient-background';
import './enhancements.css';
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://eppixlabsshop.com'),title:'Eppix Labs',description:'Independently tested research peptides.',icons:{icon:'/icon.png',apple:'/apple-icon.png'}};
export default function Layout({children}:{children:React.ReactNode}){const home=readPage('/');return <html lang="en-US" suppressHydrationWarning><head>{home?.styles.map(href=><link key={href} rel="stylesheet" href={href}/>)}<script dangerouslySetInnerHTML={{__html:`try{if(localStorage.getItem('eppix-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`}}/></head><body className={home?.bodyClass}><AmbientBackground/>{children}</body></html>;}
