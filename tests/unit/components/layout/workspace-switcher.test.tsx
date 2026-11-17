// @vitest-environment jsdom
import {cleanup,render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {I18nextProvider} from "react-i18next";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {createI18nInstance} from "@/i18n";
import {BusinessProvider} from "@/features/dashboard/business-context";
import {SidebarProvider} from "@/components/ui/sidebar";
import {WorkspaceSwitcher} from "@/components/layout/workspace-switcher";
const router=vi.hoisted(()=>({refresh:vi.fn(),push:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>router}));
const clients:QueryClient[]=[];
beforeEach(()=>{vi.stubGlobal("matchMedia",vi.fn((query)=>({matches:false,media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));});
afterEach(()=>{cleanup();clients.forEach((client)=>client.clear());clients.length=0;vi.unstubAllGlobals();vi.clearAllMocks();});
function setup(loaded=true){
 const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});clients.push(client);
 if(loaded)client.setQueryData(["identity","account-1"],{user_id:"account-1",memberships:[{tenant_id:"business-a",name:"Hiring A",role:"recruiter"},{tenant_id:"business-b",name:"Hiring B",role:"recruiter"}]});
 else vi.stubGlobal("fetch",vi.fn(()=>new Promise<Response>(()=>{})));
 client.setQueryData(["recruitment","account-1","business-a","candidates"],{private:true});
 const view=render(<I18nextProvider i18n={createI18nInstance()}><QueryClientProvider client={client}><BusinessProvider userId="account-1"><SidebarProvider><WorkspaceSwitcher/></SidebarProvider></BusinessProvider></QueryClientProvider></I18nextProvider>);
 return {...view,client};
}
it("switches businesses and clears candidate data from the previous business",async()=>{
 const {client}=setup(); await userEvent.click(screen.getByRole("button",{name:"Switch business"}));
 await userEvent.click(await screen.findByRole("menuitem",{name:"Hiring B"}));
 await waitFor(()=>expect(router.push).toHaveBeenCalledWith("/dashboard"));
 expect(client.getQueryData(["recruitment","account-1","business-a","candidates"])).toBeUndefined();
 expect(document.cookie).toContain("recruitment-business=business-b");
 expect(screen.getByRole("button",{name:"Switch business"}).textContent).toContain("Hiring B");
});
it("shows the copied skeleton until memberships load",()=>{
 const {container}=setup(false);expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy();
 expect(screen.queryByRole("button",{name:"Switch business"})).toBeNull();
});
it("offers business creation to the single Recruiter role",async()=>{
 setup(); await userEvent.click(screen.getByRole("button",{name:"Switch business"}));
 await userEvent.click(await screen.findByRole("menuitem",{name:"Add a business"}));
 expect(await screen.findByRole("dialog")).toBeTruthy();expect(screen.getByLabelText("Business name")).toBeTruthy();
});
