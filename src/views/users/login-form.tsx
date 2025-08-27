// src/components/RegisterForm.jsx

import { Button, Form, Input, Typography, message } from 'antd';
import {  MailOutlined, LockOutlined } from '@ant-design/icons';
import type {  IApiError, ILoginCredentials } from '@app/types/api';
import { useState } from 'react';
import { authService } from '@app/services/api/auth/auth.service';
import { ApiClientError } from '@app/services/api/base/error.service';
import { useNavigate } from 'react-router';

const { Title } = Typography;

const LoginForm = () => {
  // 1. Hook của AntD để quản lý trạng thái và các phương thức của form
  const [form] = Form.useForm();

  // 2. State để quản lý trạng thái loading khi đang gọi API
  const [isLoading, setIsLoading] = useState(false);

  // 3. Hook của AntD để hiển thị thông báo (thay thế cho useState<string>)
  const [messageApi, contextHolder] = message.useMessage();

  const navigate = useNavigate();

  /**
 * Hàm được gọi khi form được submit và đã vượt qua tất cả các quy tắc validation.
 * @param values - Đối tượng chứa dữ liệu từ các trường của form.
 */
  const onFinish = async (values: ILoginCredentials) => {

    setIsLoading(true);
    try {

      // Gọi hàm register từ service với dữ liệu từ form
      await authService.login(values);

      // Hiển thị thông báo thành công
      messageApi.success('Đăng nhập thành công!');

      // Reset các trường của form sau khi submit thành công
      navigate("/");


    } catch (error) {
                          
    if (error instanceof ApiClientError) {

      const apiErrorData = error.data as IApiError;
      let errorMessage = 'Lỗi không xác định';

      

      if (apiErrorData?.message) {
        errorMessage = Array.isArray(apiErrorData.message)
          ? apiErrorData.message.join('. ')
          : apiErrorData.message;
      }

      // Xử lý hiển thị lỗi như cũ
      if (errorMessage.toLowerCase().includes('username')) {
        form.setFields([{ name: 'username', errors: [errorMessage] }]);
      } else {
        messageApi.error(errorMessage);
      }

    } else {
      // Xử lý các loại lỗi khác không phải từ API client (ví dụ: lỗi mạng, lỗi code...)
      console.error('An unexpected error occurred:', error);
      messageApi.error('Một lỗi không mong muốn đã xảy ra. Vui lòng thử lại.');
    }

    } finally {
      // Dừng trạng thái loading dù thành công hay thất bại
      setIsLoading(false);
    }
  };

  // Hàm xử lý khi submit form thất bại (do lỗi validation)
  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
    message.error('Vui lòng điền đầy đủ thông tin!');
  };

  return (
    <>
      {contextHolder}
      <div style={{ maxWidth: 400, margin: '50px auto', padding: '24px', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
          Đăng nhập
        </Title>
        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          layout="vertical"
          initialValues={{ remember: true }}
          autoComplete="off"
        >

          {/* Trường Email */}
          <Form.Item
            name="username"
            label="Email"
            rules={[
              {
                required: true,
                message: 'Vui lòng nhập email!',
              },
              {
                type: 'email',
                message: 'Email không đúng định dạng!',
              },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>

          {/* Trường Mật khẩu */}
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              {
                required: true,
                message: 'Vui lòng nhập mật khẩu!',
              },
              {
                min: 6,
                message: 'Mật khẩu phải có ít nhất 6 ký tự!',
              },
            ]}
            hasFeedback // Hiển thị icon feedback (✓ hoặc ✗)
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>


          {/* Nút Đăng ký */}
          <Form.Item>
            {/* ✅ Truyền state `isLoading` vào prop `loading` của Button */}
            <Button type="primary" htmlType="submit" style={{ width: '100%' }} loading={isLoading}>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </div>
    </>
  );
};

export default LoginForm;