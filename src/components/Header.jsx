import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../images/logo-desktop.png';
import Menu from '../subComponents/Menu';
import '../css/header.css';

const Header = () => {

    const [isOpen, setIsOpen] = useState(false);
    const toggleMenu = () => setIsOpen(!isOpen);
  return (
    <div className='header'>
        <div className='header__subcontainer'>
            <div className='header__container-logo'>
                <Link className='header__logo-btn' to='/'><img className='header__logo' src={Logo} alt='Logo Mobile'/></Link>
            </div>
            <div className='header__container-icons'>
                <div className='header__container-icons-menu'>
                    <button className='header__icon' onClick={toggleMenu}><i className="hamburger bi bi-list"></i></button>
                </div>
            </div>
        </div>

        <Menu isOpen={isOpen} setIsOpen={setIsOpen} />
    </div>
  )
}

export default Header