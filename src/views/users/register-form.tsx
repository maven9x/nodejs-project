// src/components/RegisterForm.jsx

import { Button, Form, Input, InputNumber, Select, Typography, message } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import type { IApiError, IRegisterData } from '@app/types/api';
import { useState } from 'react';
import { authService } from '@app/services/api/auth/auth.service';
import { ApiClientError } from '@app/services/api/apiClientError.service';

const { Title } = Typography;

const RegisterForm = () => {
  // 1. Hook của AntD để quản lý trạng thái và các phương thức của form
  const [form] = Form.useForm();

  // 2. State để quản lý trạng thái loading khi đang gọi API
  const [isLoading, setIsLoading] = useState(false);

  // 3. Hook của AntD để hiển thị thông báo (thay thế cho useState<string>)
  const [messageApi, contextHolder] = message.useMessage();

  /**
 * Hàm được gọi khi form được submit và đã vượt qua tất cả các quy tắc validation.
 * @param values - Đối tượng chứa dữ liệu từ các trường của form.
 */
  const onFinish = async (values: IRegisterData) => {
    setIsLoading(true);
    try {
      // Gọi hàm register từ service với dữ liệu từ form
      await authService.register(values);

      // Hiển thị thông báo thành công
      messageApi.success('Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.');

      // Reset các trường của form sau khi submit thành công
      form.resetFields();

    } catch (error) {

      // ✅ BƯỚC QUAN TRỌNG: Kiểm tra kiểu của lỗi
      if (error instanceof ApiClientError) {
        // Bên trong khối if này, TypeScript biết chắc chắn `error` là một ApiClientError
        // và `error.data` sẽ có kiểu là IApiError.
        const apiErrorData = error.data as IApiError;

        let errorMessage = 'Lỗi không xác định';
        if (apiErrorData?.message) {
          errorMessage = Array.isArray(apiErrorData.message)
            ? apiErrorData.message.join('. ')
            : apiErrorData.message;
        }

        // Xử lý hiển thị lỗi như cũ
        if (errorMessage.toLowerCase().includes('email')) {
          form.setFields([{ name: 'email', errors: [errorMessage] }]);
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
          Tạo tài khoản
        </Title>
        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          layout="vertical"
          initialValues={{ remember: true }}
          autoComplete="off"
        >
          {/* Trường Tên người dùng */}
          <Form.Item
            name="name"
            label="Họ Tên"
            rules={[
              {
                required: true,
                message: 'Vui lòng nhập tên người dùng!',
              },
              {
                min: 4,
                message: 'Tên người dùng phải có ít nhất 4 ký tự!',
              },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Họ Tên" />
          </Form.Item>

          {/* Trường Email */}
          <Form.Item
            name="email"
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
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          {/* Trường Xác nhận Mật khẩu */}
          <Form.Item
            name="passwordConfirm"
            label="Xác nhận Mật khẩu"
            dependencies={['password']} // Phụ thuộc vào trường 'password'
            hasFeedback
            rules={[
              {
                required: true,
                message: 'Vui lòng xác nhận mật khẩu!',
              },
              // Custom validator function
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Hai mật khẩu bạn đã nhập không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" />
          </Form.Item>

          <Form.Item
            name="age"
            label="Tuổi"
            rules={[
              { required: true, message: 'Vui lòng nhập tuổi!' },
              { type: 'number', min: 0, max: 100, message: 'Tuổi phải từ 0 đến 100!' }
            ]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="Tuổi" />
          </Form.Item>

          <Form.Item
            name="gender"
            label="Giới tính"
            rules={[{ required: true, message: 'Vui lòng chọn giới tính!' }]}
          >
            <Select defaultValue="other">
              <Select.Option value="male">Nam</Select.Option>
              <Select.Option value="female">Nữ</Select.Option>
              <Select.Option value="other">Khác</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="address"
            label="Địa chỉ"
            rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}
          >
            <Input placeholder="Địa chỉ" />
          </Form.Item>

          {/* Nút Đăng ký */}
          <Form.Item>
            {/* ✅ Truyền state `isLoading` vào prop `loading` của Button */}
            <Button type="primary" htmlType="submit" style={{ width: '100%' }} loading={isLoading}>
              Đăng ký
            </Button>
          </Form.Item>
        </Form>
      </div>
    </>
  );
};

export default RegisterForm;