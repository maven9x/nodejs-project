import React, { useState } from 'react';
import { AppstoreOutlined, HomeOutlined, LoginOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Menu } from 'antd';
import { Link } from 'react-router';
import { useAuth } from '@app/hooks/useAuth';

type MenuItem = Required<MenuProps>['items'][number];

const items: MenuItem[] = [
  {
    label: <Link to={"/"}>Home</Link>,
    key: 'home',
    icon: <HomeOutlined />,
  },
  {
    label: <Link to={"/register"}>Register</Link>,
    key: 'register',
    icon: <AppstoreOutlined />,

  },
  {
    label: <Link to={"/login"}>Login</Link>,
    key: 'login',
    icon: <LoginOutlined />,

  }

];

const Header: React.FC = () => {
  const [current, setCurrent] = useState('mail');

  const { user, isAuthenticated, logout } = useAuth();

  const onClick: MenuProps['onClick'] = (e) => {
    console.log('click ', e);
    setCurrent(e.key);
  };

  return (
    <>
      {isAuthenticated ? (
        <div>
          <span>Chào, {user?.name}!</span>
          <button onClick={logout}>Đăng xuất</button>
        </div>
      ) : (
        <a href="/login">Đăng nhập</a>
      )}
      <Menu onClick={onClick} selectedKeys={[current]} mode="horizontal" items={items} />
    </>
  );
};

export default Header;