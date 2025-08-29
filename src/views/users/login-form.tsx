import { Button, Form, Input, Typography, message } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import type { IApiError, ILoginCredentials } from '@app/types/api';
import { useState } from 'react';
import { authService } from '@app/services/api/auth/auth.service';
import { ApiClientError } from '@app/services/api/base/error.service';
import { useNavigate } from 'react-router';
import { storage } from '@app/utils/storage';

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

  try {
    setIsLoading(true);
    const response = await authService.login(values);
    console.log('4. Gọi API thành công, response:', response);

    // --- Các bước xử lý sau khi đăng nhập thành công ---
    const { access_token, refresh_token, user } = response.data;

    storage.setItem('access_token', access_token);
    storage.setItem('refresh_token', refresh_token);
    // setAuthUser(user); // Nếu bạn có global state

    messageApi.success('Đăng nhập thành công!');
    navigate('/');

  } catch (error) {
    // Block này sẽ bắt được cả lỗi API và các lỗi JavaScript khác
    console.error('❌ Đã xảy ra lỗi trong block try-catch:', error);
    
    // Phần xử lý lỗi của bạn giữ nguyên
    if (error instanceof ApiClientError) {
      console.log(error)
      const apiErrorData = error.data as IApiError;
      const errorMessage = apiErrorData?.message || 'Lỗi không xác định';
      // ... (giữ nguyên logic xử lý lỗi API của bạn)
      messageApi.error(errorMessage);
    } else {
      messageApi.error('Một lỗi không mong muốn đã xảy ra. Vui lòng kiểm tra console.');
    }

  } finally {
    console.log('5. Kết thúc xử lý, dừng loading.');
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