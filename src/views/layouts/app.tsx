import { Outlet } from "react-router"
import Header from '@app/views/layouts/header'

const App = () =>{
    return (
        <>
            <Header/>
            <Outlet/>  
            this is footer

        </>
    )
}


export default App